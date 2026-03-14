import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { validateIngestionPayload } from "../contracts/v1";
import { WebhookService } from "./webhook.service";

@Controller("webhook")
export class WebhookController {
  public constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  public async handleWebhook(@Body() payload: unknown): Promise<{ accepted: true }> {
    try {
      const validatedPayload = validateIngestionPayload(payload);

      await this.webhookService.recordIncomingPayload(validatedPayload);
    } catch (error) {
      throw new BadRequestException("Invalid publisher payload");
    }

    return { accepted: true };
  }
}
