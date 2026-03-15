import { Injectable, Logger } from "@nestjs/common";

import { EventBatchSchema, EventSchema, IngestionPayloadSchema, isEventBatchPayload } from "../contracts/v1";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "../config/configuration";
import { runWithConcurrency } from "../common/run-with-concurrency";
import { NatsService } from "../messaging/nats.service";
import { MetricsService } from "../observability/metrics.service";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  public constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService<{ app: AppConfig }, true>,
    private readonly metricsService: MetricsService
  ) {}

  public async recordIncomingPayload(payload: IngestionPayloadSchema, requestId: string): Promise<void> {
    const summary = this.describePayload(payload);
    const appConfig = this.configService.getOrThrow("app");

    this.logger.log(`Received webhook payload: requestId=${requestId} ${summary}`);

    const events = isEventBatchPayload(payload) ? payload : [payload];
    const subject = appConfig.natsIngestSubject;
    const startedAt = Date.now();

    try {
      await runWithConcurrency(events, appConfig.webhookPublishConcurrency, async (event) => {
        await this.natsService.publishEvent(subject, event, { requestId });
      });
    } catch (error) {
      this.metricsService.recordWebhookPublishFailure();
      throw error;
    }

    const durationMs = Date.now() - startedAt;
    this.metricsService.recordWebhookRequest(events.length, durationMs);

    this.logger.log(
      `Published batch requestId=${requestId} size=${events.length} subject=${subject} concurrency=${appConfig.webhookPublishConcurrency} durationMs=${durationMs}`
    );
  }

  private describePayload(payload: IngestionPayloadSchema): string {
    if (isEventBatchPayload(payload)) {
      return this.describeBatchPayload(payload);
    }

    return this.describeSinglePayload(payload);
  }

  private describeBatchPayload(payload: EventBatchSchema): string {
    const firstItem = payload[0];
    const firstSummary = this.describeSinglePayload(firstItem);

    return `batch size=${payload.length} first={${firstSummary}}`;
  }

  private describeSinglePayload(payload: EventSchema): string {
    const eventId = payload.eventId;
    const source = payload.source;
    const eventType = payload.eventType;
    const keys = Object.keys(payload).slice(0, 8).join(",");

    return `eventId=${eventId} source=${source} eventType=${eventType} keys=[${keys}]`;
  }
}
