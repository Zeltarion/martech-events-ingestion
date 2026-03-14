import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Event, validateIngestionPayload } from "../contracts/v1";
import { AppConfig } from "../config/configuration";
import { NatsService } from "../messaging/nats.service";
import { StreamBootstrapService } from "../messaging/stream.bootstrap";
import { EventsRepository } from "../persistence/events.repository";

@Injectable()
export class ConsumerService implements OnModuleInit {
  private readonly logger = new Logger(ConsumerService.name);

  public constructor(
    private readonly natsService: NatsService,
    private readonly streamBootstrapService: StreamBootstrapService,
    private readonly eventsRepository: EventsRepository,
    private readonly configService: ConfigService<{ app: AppConfig }, true>
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

    const subscription = await connection.jetstream().subscribe(
      subject,
      await this.natsService.buildConsumerOptions(durableName, subject)
    );

    this.logger.log(`Started JetStream consumer ${durableName}`);

    void (async () => {
      for await (const message of subscription) {
        try {
          const event = this.natsService.decodeJson<Event>(message.data);
          const validatedPayload = validateIngestionPayload(event);

          if (Array.isArray(validatedPayload)) {
            throw new Error("Worker received batched payload on single-event subject");
          }

          const inserted = await this.eventsRepository.insertEvent(validatedPayload);

          message.ack();

          this.logger.log(
            `Persisted eventId=${validatedPayload.eventId} inserted=${inserted} redelivery=${message.info.redeliveryCount}`
          );
        } catch (error) {
          this.logger.error("Failed to process JetStream message", error instanceof Error ? error.stack : undefined);
        }
      }
    })();
  }
}
