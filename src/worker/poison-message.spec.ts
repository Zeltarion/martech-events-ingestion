import { headers } from "nats";
import { ZodError } from "zod";

import { buildDlqEnvelope, isPoisonMessageError, PoisonMessageError } from "./poison-message";

describe("poison-message helpers", () => {
  it("classifies poison worker errors correctly", () => {
    expect(isPoisonMessageError(new PoisonMessageError("bad payload"))).toBe(true);
    expect(isPoisonMessageError(new SyntaxError("invalid json"))).toBe(true);
    expect(isPoisonMessageError(new ZodError([]))).toBe(true);
    expect(isPoisonMessageError(new Error("db timeout"))).toBe(false);
  });

  it("builds a DLQ envelope from a poisoned message", () => {
    const messageHeaders = headers();
    messageHeaders.set("x-request-id", "req-123");

    const message = {
      data: new TextEncoder().encode(JSON.stringify({ eventId: "evt-1", foo: "bar" })),
      subject: "events.ingest.v1",
      headers: messageHeaders,
      info: {
        redeliveryCount: 2
      }
    };

    const envelope = buildDlqEnvelope(message as never, new PoisonMessageError("schema mismatch"));

    expect(envelope.requestId).toBe("req-123");
    expect(envelope.reason).toBe("schema mismatch");
    expect(envelope.subject).toBe("events.ingest.v1");
    expect(envelope.redeliveryCount).toBe(2);
    expect(envelope.eventId).toBe("evt-1");
    expect(envelope.rawPayload).toContain("\"eventId\":\"evt-1\"");
  });
});
