import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { WebhookService } from "./webhook.service";

@Controller("webhook")
export class WebhookController {
  public constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  public handleWebhook(@Body() payload: unknown): { accepted: true } {
    this.webhookService.recordIncomingPayload(payload);

    return { accepted: true };
  }
}
