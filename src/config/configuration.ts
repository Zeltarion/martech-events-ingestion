export interface AppConfig {
  nodeEnv: string;
  port: number;
  reportsPort: number;
  databaseUrl: string;
  natsUrl: string;
  natsStreamName: string;
  natsIngestSubject: string;
  natsDlqSubject: string;
  natsDurableName: string;
  webhookPublishConcurrency: number;
  workerConcurrency: number;
  logLevel: string;
  readinessEnabled: boolean;
}

function getNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export default (): { app: AppConfig } => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: getNumber(process.env.PORT, 3000),
    reportsPort: getNumber(process.env.REPORTS_PORT, 3001),
    databaseUrl: process.env.DATABASE_URL as string,
    natsUrl: process.env.NATS_URL as string,
    natsStreamName: process.env.NATS_STREAM_NAME ?? "EVENTS",
    natsIngestSubject: process.env.NATS_INGEST_SUBJECT ?? "events.ingest.v1",
    natsDlqSubject: process.env.NATS_DLQ_SUBJECT ?? "events.dlq.v1",
    natsDurableName: process.env.NATS_DURABLE_NAME ?? "events-db-writer-v1",
    webhookPublishConcurrency: getNumber(process.env.WEBHOOK_PUBLISH_CONCURRENCY, 50),
    workerConcurrency: getNumber(process.env.WORKER_CONCURRENCY, 10),
    logLevel: process.env.LOG_LEVEL ?? "debug",
    readinessEnabled: (process.env.READINESS_ENABLED ?? "true") === "true"
  }
});
