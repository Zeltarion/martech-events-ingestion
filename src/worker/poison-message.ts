interface MessageHeadersLike {
  get(key: string): string | undefined;
}

interface WorkerMessageLike {
  data: Uint8Array;
  subject: string;
  headers?: MessageHeadersLike;
  info: {
    redeliveryCount: number;
  };
}

import { ZodError } from "zod";

export class PoisonMessageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PoisonMessageError";
  }
}

export interface DlqEnvelope {
  requestId: string;
  reason: string;
  subject: string;
  redeliveryCount: number;
  receivedAt: string;
  eventId: string | null;
  rawPayload: string;
}

export function isPoisonMessageError(error: unknown): boolean {
  return error instanceof PoisonMessageError || error instanceof SyntaxError || error instanceof ZodError;
}

export function buildDlqEnvelope(message: WorkerMessageLike, error: unknown): DlqEnvelope {
  const rawPayload = new TextDecoder().decode(message.data);
  const parsedPayload = tryParseRawPayload(rawPayload);

  return {
    requestId: message.headers?.get("x-request-id") ?? "unknown",
    reason: error instanceof Error ? error.message : "Unknown poison message error",
    subject: message.subject,
    redeliveryCount: message.info.redeliveryCount,
    receivedAt: new Date().toISOString(),
    eventId: extractEventId(parsedPayload),
    rawPayload
  };
}

function tryParseRawPayload(rawPayload: string): unknown {
  try {
    return JSON.parse(rawPayload);
  } catch {
    return null;
  }
}

function extractEventId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  if (!("eventId" in payload)) {
    return null;
  }

  return typeof payload.eventId === "string" ? payload.eventId : null;
}
