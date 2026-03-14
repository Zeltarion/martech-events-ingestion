import { Injectable, Logger } from "@nestjs/common";

import { EventBatchSchema, EventSchema, IngestionPayloadSchema, isEventBatchPayload } from "../contracts/v1";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "../config/configuration";
import { NatsService } from "../messaging/nats.service";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  public constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService<{ app: AppConfig }, true>
  ) {}

  public async recordIncomingPayload(payload: IngestionPayloadSchema): Promise<void> {
    const summary = this.describePayload(payload);
    const appConfig = this.configService.getOrThrow("app");

    this.logger.log(`Received webhook payload: ${summary}`);

    const events = isEventBatchPayload(payload) ? payload : [payload];
    const subject = appConfig.natsIngestSubject;

    for (const event of events) {
      await this.natsService.publishEvent(subject, event);
    }
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
