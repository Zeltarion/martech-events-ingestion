import { Logger, LogLevel } from "@nestjs/common";

const ALLOWED_LOG_LEVELS: LogLevel[] = [
  "log",
  "error",
  "warn",
  "debug",
  "verbose",
  "fatal"
];

export function buildNestLogger(logLevel: string | undefined): LogLevel[] {
  if (!logLevel) {
    return ["log", "error", "warn", "debug"];
  }

  const normalized = logLevel.toLowerCase();
  const matchedIndex = ALLOWED_LOG_LEVELS.indexOf(normalized as LogLevel);

  if (matchedIndex === -1) {
    return ["log", "error", "warn", "debug"];
  }

  return ALLOWED_LOG_LEVELS.slice(0, matchedIndex + 1);
}

export function logBootstrap(appName: string, port?: number): void {
  const logger = new Logger(`${appName}Bootstrap`);

  if (typeof port === "number") {
    logger.log(`${appName} listening on port ${port}`);

    return;
  }

  logger.log(`${appName} started`);
}
