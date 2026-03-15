import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().port().default(3000),
  WORKER_PORT: Joi.number().port().default(3002),
  REPORTS_PORT: Joi.number().port().default(3001),
  DATABASE_URL: Joi.string().uri({ scheme: ["postgres", "postgresql"] }).required(),
  NATS_URL: Joi.string().uri({ scheme: ["nats"] }).required(),
  NATS_STREAM_NAME: Joi.string().default("EVENTS"),
  NATS_INGEST_SUBJECT: Joi.string().default("events.ingest.v1"),
  NATS_DLQ_SUBJECT: Joi.string().default("events.dlq.v1"),
  NATS_DURABLE_NAME: Joi.string().default("events-db-writer-v1"),
  NATS_STREAM_MAX_AGE_HOURS: Joi.number().integer().min(1).default(24),
  WEBHOOK_PUBLISH_CONCURRENCY: Joi.number().integer().min(1).default(50),
  WORKER_CONCURRENCY: Joi.number().integer().min(1).default(10),
  WORKER_BATCH_SIZE: Joi.number().integer().min(1).default(100),
  WORKER_BATCH_FLUSH_MS: Joi.number().integer().min(1).default(100),
  LOG_LEVEL: Joi.string().default("debug"),
  READINESS_ENABLED: Joi.boolean().truthy("true").falsy("false").default(true)
});
