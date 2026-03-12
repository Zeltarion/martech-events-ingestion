import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  public recordIncomingPayload(payload: unknown): void {
    const summary = this.describePayload(payload);

    this.logger.log(`Received webhook payload: ${summary}`);
  }

  private describePayload(payload: unknown): string {
    if (Array.isArray(payload)) {
      return this.describeBatchPayload(payload);
    }

    return this.describeSinglePayload(payload);
  }

  private describeBatchPayload(payload: unknown[]): string {
    const firstItem = payload[0];
    const firstSummary = this.describeSinglePayload(firstItem);

    return `batch size=${payload.length} first={${firstSummary}}`;
  }

  private describeSinglePayload(payload: unknown): string {
    if (!payload || typeof payload !== "object") {
      return "non-object payload";
    }

    const candidate = payload as Record<string, unknown>;
    const eventId = typeof candidate.eventId === "string" ? candidate.eventId : "unknown";
    const source = typeof candidate.source === "string" ? candidate.source : "unknown";
    const eventType = typeof candidate.eventType === "string" ? candidate.eventType : "unknown";
    const keys = Object.keys(candidate).slice(0, 8).join(",");

    return `eventId=${eventId} source=${source} eventType=${eventType} keys=[${keys}]`;
  }
}
