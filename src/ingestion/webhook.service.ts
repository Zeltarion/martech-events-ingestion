import { Injectable, Logger } from "@nestjs/common";

import { EventBatchSchema, EventSchema, IngestionPayloadSchema, isEventBatchPayload } from "../contracts/v1";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  public recordIncomingPayload(payload: IngestionPayloadSchema): void {
    const summary = this.describePayload(payload);

    this.logger.log(`Received webhook payload: ${summary}`);
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
