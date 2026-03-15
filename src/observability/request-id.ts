import { randomUUID } from "node:crypto";

export function resolveRequestId(headerValue?: string): string {
  if (headerValue && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  return randomUUID();
}
