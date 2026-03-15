import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JsMsg } from "nats";

import { drainConcurrencyPool, enqueueWithConcurrencyLimit } from "../common/run-with-concurrency";
import { Event, validateIngestionPayload } from "../contracts/v1";
import { AppConfig } from "../config/configuration";
import { NatsService } from "../messaging/nats.service";
import { StreamBootstrapService } from "../messaging/stream.bootstrap";
import { MetricsService } from "../observability/metrics.service";
import { EventsRepository } from "../persistence/events.repository";
import { buildDlqEnvelope, isPoisonMessageError, PoisonMessageError } from "./poison-message";

interface PendingMessage {
  message: JsMsg;
  event: Event;
}

@Injectable()
export class ConsumerService implements OnModuleInit {
  private readonly logger = new Logger(ConsumerService.name);
  private pendingBatch: PendingMessage[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly inFlightFlushes = new Set<Promise<void>>();

  public constructor(
    private readonly natsService: NatsService,
    private readonly streamBootstrapService: StreamBootstrapService,
    private readonly eventsRepository: EventsRepository,
    private readonly configService: ConfigService<{ app: AppConfig }, true>,
    private readonly metricsService: MetricsService
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.streamBootstrapService.ensureStreamAndConsumer();
    await this.startConsumerLoop();
  }

  private async startConsumerLoop(): Promise<void> {
    const connection = await this.natsService.getConnection();
    const appConfig = this.configService.getOrThrow("app");
    const durableName = appConfig.natsDurableName;
    const subject = appConfig.natsIngestSubject;
    const dlqSubject = appConfig.natsDlqSubject;
    const concurrency = appConfig.workerConcurrency;
    const batchSize = appConfig.workerBatchSize;
    const batchFlushMs = appConfig.workerBatchFlushMs;

    const subscription = await connection.jetstream().subscribe(
      subject,
      await this.natsService.buildConsumerOptions(durableName, subject)
    );

    this.logger.log(
      `Started JetStream consumer ${durableName} subject=${subject} dlqSubject=${dlqSubject} concurrency=${concurrency} batchSize=${batchSize} batchFlushMs=${batchFlushMs}`
    );

    void (async () => {
      for await (const message of subscription) {
        await this.enqueueMessage(message, batchSize, batchFlushMs, concurrency);
      }

      await this.flushPendingBatch(concurrency);
      await drainConcurrencyPool(this.inFlightFlushes);
    })();
  }

  private async enqueueMessage(
    message: JsMsg,
    batchSize: number,
    batchFlushMs: number,
    concurrency: number
  ): Promise<void> {
    try {
      const event = this.natsService.decodeJson<Event>(message.data);
      const validatedPayload = validateIngestionPayload(event);

      if (Array.isArray(validatedPayload)) {
        throw new PoisonMessageError("Worker received batched payload on single-event subject");
      }

      this.pendingBatch.push({
        message,
        event: validatedPayload
      });

      this.ensureFlushTimer(batchFlushMs, concurrency);

      if (this.pendingBatch.length >= batchSize) {
        await this.flushPendingBatch(concurrency);
      }
    } catch (error) {
      if (isPoisonMessageError(error)) {
        await this.parkPoisonMessage(message, error);
        return;
      }

      this.metricsService.recordWorkerFailure();
      this.logger.error("Failed to process JetStream message", error instanceof Error ? error.stack : undefined);
    }
  }

  private ensureFlushTimer(batchFlushMs: number, concurrency: number): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushPendingBatch(concurrency);
    }, batchFlushMs);
  }

  private async flushPendingBatch(concurrency: number): Promise<void> {
    if (this.pendingBatch.length === 0) {
      return;
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const batch = this.pendingBatch.splice(0, this.pendingBatch.length);
    await enqueueWithConcurrencyLimit(this.inFlightFlushes, concurrency, async () => {
      await this.processBatch(batch);
    });
  }

  private async processBatch(batch: PendingMessage[]): Promise<void> {
    try {
      const startedAt = Date.now();
      const insertedEventIds = await this.eventsRepository.insertEvents(batch.map((item) => item.event));
      this.metricsService.recordWorkerBatch(
        batch.length,
        insertedEventIds.size,
        Date.now() - startedAt
      );

      for (const item of batch) {
        item.message.ack();
        const requestId = item.message.headers?.get("x-request-id") ?? "unknown";

        this.logger.log(
          `Persisted requestId=${requestId} eventId=${item.event.eventId} inserted=${insertedEventIds.has(item.event.eventId)} redelivery=${item.message.info.redeliveryCount}`
        );
      }
    } catch (error) {
      this.metricsService.recordWorkerFailure();
      this.logger.error("Failed to persist worker batch", error instanceof Error ? error.stack : undefined);
    }
  }

  private async parkPoisonMessage(message: JsMsg, error: unknown): Promise<void> {
    const appConfig = this.configService.getOrThrow("app");
    const envelope = buildDlqEnvelope(message, error);

    await this.natsService.publishDlqMessage(appConfig.natsDlqSubject, envelope, {
      requestId: envelope.requestId,
      messageId: `${message.subject}:${envelope.eventId ?? "unknown"}:${message.info.streamSequence}`
    });

    message.ack();
    this.metricsService.recordWorkerDlqMessage();

    this.logger.warn(
      `Moved poison message to DLQ requestId=${envelope.requestId} eventId=${envelope.eventId ?? "unknown"} reason="${envelope.reason}" redelivery=${message.info.redeliveryCount}`
    );
  }
}
