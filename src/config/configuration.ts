export interface AppConfig {
  nodeEnv: string;
  port: number;
  workerPort: number;
  reportsPort: number;
  databaseUrl: string;
  natsUrl: string;
  natsStreamName: string;
  natsIngestSubject: string;
  natsDlqSubject: string;
  natsDurableName: string;
  natsStreamMaxAgeHours: number;
  natsConsumerAckWaitMs: number;
  natsConsumerMaxAckPending: number;
  webhookPublishConcurrency: number;
  workerConcurrency: number;
  workerBatchSize: number;
  workerBatchFlushMs: number;
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

function getOptionalNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export default (): { app: AppConfig } => ({
  app: (() => {
    const workerConcurrency = getNumber(process.env.WORKER_CONCURRENCY, 10);
    const workerBatchSize = getNumber(process.env.WORKER_BATCH_SIZE, 100);
    const derivedMaxAckPending = Math.max(workerConcurrency * workerBatchSize, 100);

    return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: getNumber(process.env.PORT, 3000),
    workerPort: getNumber(process.env.WORKER_PORT, 3002),
    reportsPort: getNumber(process.env.REPORTS_PORT, 3001),
    databaseUrl: process.env.DATABASE_URL as string,
    natsUrl: process.env.NATS_URL as string,
    natsStreamName: process.env.NATS_STREAM_NAME ?? "EVENTS",
    natsIngestSubject: process.env.NATS_INGEST_SUBJECT ?? "events.ingest.v1",
    natsDlqSubject: process.env.NATS_DLQ_SUBJECT ?? "events.dlq.v1",
    natsDurableName: process.env.NATS_DURABLE_NAME ?? "events-db-writer-v1",
    natsStreamMaxAgeHours: getNumber(process.env.NATS_STREAM_MAX_AGE_HOURS, 24),
    natsConsumerAckWaitMs: getNumber(process.env.NATS_CONSUMER_ACK_WAIT_MS, 60_000),
    natsConsumerMaxAckPending:
      getOptionalNumber(process.env.NATS_CONSUMER_MAX_ACK_PENDING) ?? derivedMaxAckPending,
    webhookPublishConcurrency: getNumber(process.env.WEBHOOK_PUBLISH_CONCURRENCY, 50),
    workerConcurrency,
    workerBatchSize,
    workerBatchFlushMs: getNumber(process.env.WORKER_BATCH_FLUSH_MS, 100),
    logLevel: process.env.LOG_LEVEL ?? "debug",
    readinessEnabled: (process.env.READINESS_ENABLED ?? "true") === "true"
    };
  })()
});
