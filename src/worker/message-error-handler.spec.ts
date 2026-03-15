import { handleWorkerMessageError } from "./message-error-handler";
import { PoisonMessageError } from "./poison-message";

describe("handleWorkerMessageError", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("records a worker failure when DLQ parking fails for a poison message", async () => {
    const handlers = {
      parkPoisonMessage: jest.fn().mockRejectedValue(new Error("dlq unavailable")),
      recordWorkerFailure: jest.fn(),
      logProcessingFailure: jest.fn(),
      logDlqFailure: jest.fn()
    };

    await expect(
      handleWorkerMessageError(new PoisonMessageError("bad payload"), handlers)
    ).resolves.toBeUndefined();

    expect(handlers.parkPoisonMessage).toHaveBeenCalledTimes(1);
    expect(handlers.recordWorkerFailure).toHaveBeenCalledTimes(1);
    expect(handlers.logDlqFailure).toHaveBeenCalledTimes(1);
    expect(handlers.logProcessingFailure).not.toHaveBeenCalled();
  });

  it("records a processing failure for transient errors", async () => {
    const handlers = {
      parkPoisonMessage: jest.fn(),
      recordWorkerFailure: jest.fn(),
      logProcessingFailure: jest.fn(),
      logDlqFailure: jest.fn()
    };

    await expect(
      handleWorkerMessageError(new Error("db timeout"), handlers)
    ).resolves.toBeUndefined();

    expect(handlers.parkPoisonMessage).not.toHaveBeenCalled();
    expect(handlers.recordWorkerFailure).toHaveBeenCalledTimes(1);
    expect(handlers.logProcessingFailure).toHaveBeenCalledTimes(1);
    expect(handlers.logDlqFailure).not.toHaveBeenCalled();
  });
});
