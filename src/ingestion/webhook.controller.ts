import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post, Res } from "@nestjs/common";
import { Response } from "express";

import { validateIngestionPayload } from "../contracts/v1";
import { resolveRequestId } from "../observability/request-id";
import { WebhookService } from "./webhook.service";

@Controller("webhook")
export class WebhookController {
  public constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  public async handleWebhook(
    @Body() payload: unknown,
    @Headers("x-request-id") requestIdHeader: string | undefined,
    @Res({ passthrough: true }) response: Response
  ): Promise<{ accepted: true; requestId: string }> {
    const requestId = resolveRequestId(requestIdHeader);

    response.setHeader("x-request-id", requestId);

    try {
      const validatedPayload = validateIngestionPayload(payload);

      await this.webhookService.recordIncomingPayload(validatedPayload, requestId);
    } catch (error) {
      throw new BadRequestException("Invalid publisher payload");
    }

    return { accepted: true, requestId };
  }
}
