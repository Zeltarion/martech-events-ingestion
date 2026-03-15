import { isPoisonMessageError } from "./poison-message";

export interface WorkerErrorHandlers {
  parkPoisonMessage: (error: unknown) => Promise<void>;
  recordWorkerFailure: () => void;
  logProcessingFailure: (error: unknown) => void;
  logDlqFailure: (error: unknown) => void;
}

export async function handleWorkerMessageError(
  error: unknown,
  handlers: WorkerErrorHandlers
): Promise<void> {
  if (isPoisonMessageError(error)) {
    try {
      await handlers.parkPoisonMessage(error);
    } catch (dlqError) {
      handlers.recordWorkerFailure();
      handlers.logDlqFailure(dlqError);
    }

    return;
  }

  handlers.recordWorkerFailure();
  handlers.logProcessingFailure(error);
}
