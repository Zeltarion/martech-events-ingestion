# MarTech Event Pipeline

NestJS, NATS JetStream, PostgreSQL, TypeORM, Docker Compose.

This repository implements a production-minded event-driven backend system that ingests webhook events, buffers them through NATS JetStream for reliable asynchronous delivery, persists them into PostgreSQL, and exposes reporting APIs for analytics.

The full infrastructure is intended to start with a single command:

```bash
docker-compose up
```

## Overview

Event source: the Dockerized publisher image `andriiuni/events` continuously sends JSON events via HTTP POST to the webhook endpoint exposed by the API service.

Flow:

```text
publisher -> POST /webhook
          -> API validates and publishes to NATS JetStream (events.ingest.v1)
          -> Worker consumes, deduplicates, and persists to PostgreSQL
          -> Reports API queries PostgreSQL and exposes analytics endpoints
```

Key properties:

- Reliability: JetStream durable delivery plus ack after DB commit plus DB-level deduplication.
- Scalability: API and Worker run as separate processes or containers and can be scaled independently.
- Observability: structured logs plus liveness and readiness health checks.
- Maintainability: modular monolith structure with clear boundaries and versioned contracts.

## Burst Handling

The system is designed to absorb short bursts of a few thousand events per minute without pushing synchronous write pressure onto the webhook endpoint.

The API returns quickly after validation and publish, while NATS JetStream buffers burst traffic and the Worker drains it asynchronously into PostgreSQL.

This MVP relies on queue-based decoupling and separate API and Worker processes as the primary burst-handling strategy. If sustained load requires it later, the design leaves room for controlled concurrency, batch inserts, and consumer tuning.

Two lightweight throughput controls are already exposed through environment variables:

- `WEBHOOK_PUBLISH_CONCURRENCY`: limits how many event publishes the API performs in parallel for a single incoming batch
- `WORKER_CONCURRENCY`: limits how many JetStream messages the Worker processes concurrently while still acknowledging only after persistence succeeds
- `NATS_CONSUMER_ACK_WAIT_MS`: controls how long JetStream waits for a worker `ack` before redelivery becomes eligible
- `NATS_CONSUMER_MAX_ACK_PENDING`: caps how many unacked messages JetStream may have in flight for the worker at once

## Architecture

This is a modular monolith with separate entrypoints for API, Worker, and Reports. It runs as multiple containers from the same image, which keeps the MVP small while preserving clean seams for future extraction or independent scaling.

```text
publisher (HTTP)
   |
   v
api: POST /webhook
   |
   v
NATS JetStream (events.ingest.v1)
   |
   v
worker (durable consumer)
   |
   v
PostgreSQL (raw_events)
   |
   v
reports API (GET /reports/*)
```

## Services And Run Modes

The same codebase is started via different entrypoints:

- API: receives webhooks and publishes to NATS  
  `node dist/entrypoints/api.main.js`
- Worker: consumes from JetStream and writes to PostgreSQL  
  `node dist/entrypoints/worker.main.js`
- Reports: serves `GET /reports/*` endpoints  
  `node dist/entrypoints/reports.main.js`

In `docker-compose`, these run as separate containers from the same image.

## Delivery Semantics

The system uses NATS JetStream for durable asynchronous delivery.

- Stream: `EVENTS`
- Subject: `events.ingest.v1`
- Consumer: durable, for example `events-db-writer-v1`
- Semantics: at-least-once delivery
- Idempotency: PostgreSQL dedup via `UNIQUE(event_id)` plus `INSERT ... ON CONFLICT DO NOTHING`
- Stream retention: JetStream uses limits-based retention with `max_age` controlled by `NATS_STREAM_MAX_AGE_HOURS`
- Consumer backpressure: `max_ack_pending` is bounded and defaults to `WORKER_CONCURRENCY * WORKER_BATCH_SIZE`, so JetStream does not outpace the worker's current batch-processing capacity
- Redelivery timing: `ack_wait` is configurable through `NATS_CONSUMER_ACK_WAIT_MS` to keep batch persistence and redelivery timing aligned
- DLQ path: non-recoverable poison messages are published to `events.dlq.v1` and then `ack`ed so they do not loop forever on the primary consumer

Result: effectively-once persistence, built from at-least-once transport plus idempotent writes.

## Duplicates And Out-Of-Order Events

Duplicates are expected and handled by a unique constraint on `event_id`.

Out-of-order events are expected and handled by storing the original event timestamp as `occurred_at` and building reports against event time rather than ingestion order.

## Error Handling And Poison Messages

The Worker uses a simple classification policy:

- transient persistence or infrastructure failures: do not `ack`, rely on JetStream redelivery
- duplicate inserts: treat as successful idempotent processing and `ack`
- non-recoverable poison messages such as invalid JSON, schema validation failures, or batched payloads on the single-event worker subject: publish a DLQ envelope to `events.dlq.v1`, then `ack`

Each DLQ envelope includes:

- `requestId`
- `reason`
- `subject`
- `redeliveryCount`
- `receivedAt`
- `eventId` when it can be extracted safely
- the original `rawPayload`

## Data Model

Primary table: `raw_events`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` | Primary key |
| `event_id` | `text` | Unique source event id |
| `occurred_at` | `timestamptz` | Parsed from event timestamp |
| `source` | `text` | `facebook` or `tiktok` |
| `funnel_stage` | `text` | `top` or `bottom` |
| `event_type` | `text` | Event type from the contract |
| `user_id` | `text` | Extracted from payload |
| `country` | `text` | Extracted country, nullable |
| `purchase_amount` | `numeric` | Extracted numeric purchase amount, nullable |
| `payload` | `jsonb` | Full raw event |
| `ingested_at` | `timestamptz` | Default `now()` |

Recommended indexes:

- `UNIQUE(event_id)`
- `(occurred_at)`
- `(source, occurred_at)`
- `(event_type, occurred_at)`
- `(country, occurred_at)` if geo reports justify it
- partial `(source, occurred_at)` where `purchase_amount IS NOT NULL` for revenue queries

## Retention Policy

Retention is intentionally explicit:

- JetStream keeps buffered transport messages for a bounded period via `NATS_STREAM_MAX_AGE_HOURS`
- PostgreSQL `raw_events` is the system of record for analytics in the MVP and does not auto-prune rows

Current MVP expectation:

- JetStream retention protects local environments from unbounded queue growth
- Postgres retention is managed manually during development, for example by resetting Docker volumes when needed
- If the project evolves beyond MVP, Postgres retention should move to a documented TTL, archival, or partitioning strategy

## API Endpoints

### Ingestion

`POST /webhook`

Receives events from `andriiuni/events`, validates them, and publishes them to `events.ingest.v1`.

- Success: `202 Accepted`
- Invalid payload: `400 Bad Request`

### Reporting

All reporting endpoints support `from` and `to` in ISO format and optional filters where relevant.

`GET /reports/funnel?from=&to=&source=`

Returns funnel conversion summary.

Example:

```json
{
  "from": "2026-03-01T00:00:00Z",
  "to": "2026-03-02T00:00:00Z",
  "source": "facebook",
  "topCount": 1234,
  "bottomCount": 321,
  "conversionRate": 0.26
}
```

`GET /reports/countries?from=&to=&source=&limit=10`

Returns top countries by event count and unique users.

Example:

```json
{
  "items": [
    { "country": "US", "eventsCount": 1200, "uniqueUsers": 340 },
    { "country": "GB", "eventsCount": 900, "uniqueUsers": 250 }
  ]
}
```

`GET /reports/revenue?from=&to=&groupBy=day`

Returns revenue aggregation from events that include `purchaseAmount`.

For MVP, numeric string values are extracted into the dedicated `purchase_amount` column during ingestion. `null` and invalid values are ignored, and report queries aggregate the extracted column instead of reparsing `jsonb` on every request.

Example:

```json
{
  "groupBy": "day",
  "items": [
    { "bucket": "2026-03-01", "revenue": "1523.50" },
    { "bucket": "2026-03-02", "revenue": "892.10" }
  ],
  "totalRevenue": "2415.60"
}
```

## Health Checks

- `GET /health/liveness`: process is running
- `GET /health/readiness`: verifies PostgreSQL and NATS connectivity and returns `503 Service Unavailable` when a required dependency is down

## Observability

- Consistent Nest logger output across API, Worker, and Reports entrypoints
- Request correlation via `x-request-id` propagated from webhook ingress to JetStream consumer logs
- Key operational fields in log messages such as `requestId`, `eventId`, `source`, `subject`, `redelivery`, and `consumer`
- Health checks for orchestration and monitoring
- `GET /metrics` is exposed by API, Worker, and Reports for Prometheus scraping
- Prometheus is available at `http://localhost:9090`
- Grafana is available at `http://localhost:3003` with `admin/admin`
- Grafana is provisioned with a default `MarTech Events Overview` dashboard
- Loki is available at `http://localhost:3100`
- Promtail ships Docker container logs into Loki with labels such as `project`, `service`, `container`, and `stream`
- Grafana is provisioned with a `MarTech Logs Overview` dashboard for centralized log inspection
- Prometheus data is stored on a Docker volume so historical metrics survive container restarts

Current metrics coverage:

- Webhook:
  - `mei_webhook_requests_total`
  - `mei_webhook_events_received_total`
  - `mei_webhook_publish_failures_total`
  - `mei_webhook_publish_duration_ms_avg`
- Worker:
  - `mei_worker_batches_total`
  - `mei_worker_batch_size_avg`
  - `mei_worker_messages_processed_total`
  - `mei_worker_messages_inserted_total`
  - `mei_worker_messages_duplicate_total`
  - `mei_worker_processing_failures_total`
  - `mei_worker_dlq_messages_total`
  - `mei_worker_batch_duration_ms_avg`
- Reports:
  - `mei_reports_requests_total`
  - `mei_reports_funnel_requests_total`
  - `mei_reports_countries_requests_total`
  - `mei_reports_revenue_requests_total`
  - `mei_reports_duration_ms_avg`
  - `mei_reports_funnel_duration_ms_avg`
  - `mei_reports_countries_duration_ms_avg`
  - `mei_reports_revenue_duration_ms_avg`
- Process lifecycle:
  - `mei_process_start_time_seconds`

Future metrics that would be useful if the system grows further:

- JetStream consumer lag or stream depth
- per-source metrics for `facebook` and `tiktok`
- histogram-based latency metrics instead of averages only
- database-level persistence latency and retry visibility

Grafana query note:

- dashboard panels use `sum(...)`, `avg(...)`, and `rate(...)` where appropriate so the visuals stay meaningful if multiple instances of the same service are running
- logs can be filtered in Grafana by labels such as `service="api"` or `service="worker"`

## Running Locally

1. Start everything:

```bash
docker-compose up --build
```

2. Verify health:

```bash
curl -s http://localhost:3000/health/liveness
curl -s http://localhost:3000/health/readiness
curl -s http://localhost:3000/metrics
curl -s http://localhost:3002/metrics
curl -s http://localhost:3001/metrics
```

3. Call reports:

```bash
curl -s "http://localhost:3001/reports/funnel?from=2026-03-01T00:00:00Z&to=2026-03-02T00:00:00Z"
curl -s "http://localhost:3001/reports/countries?from=2026-03-01T00:00:00Z&to=2026-03-02T00:00:00Z&limit=10"
curl -s "http://localhost:3001/reports/revenue?from=2026-03-01T00:00:00Z&to=2026-03-02T00:00:00Z&groupBy=day"
```

4. Inspect observability:

```bash
open http://localhost:9090
open http://localhost:3003
```

5. Inspect centralized logs:

- Open Grafana and use the `MarTech Logs Overview` dashboard
- Or use Grafana Explore with the Loki datasource
- Example Loki selectors:
  - `{project="martech-events-ingestion"}`
  - `{project="martech-events-ingestion",service="api"}`
  - `{project="martech-events-ingestion",service="worker"} |= "requestId="`

## Development Note

The publisher emits a continuous high-volume stream and can fill the development database quickly.

Recommended workflow:

1. Start the full stack and verify the end-to-end flow.
2. Confirm that webhook ingest, JetStream delivery, worker persistence, and Postgres writes all work.
3. Stop the publisher while continuing development:

```bash
docker compose stop publisher
npm run dev:publisher:stop
```

When another end-to-end verification pass is needed, start it again:

```bash
docker compose start publisher
npm run dev:publisher:start
```

If local resource usage needs to be reduced further, lower `WEBHOOK_PUBLISH_CONCURRENCY` and `WORKER_CONCURRENCY` in `.env`.
If queue storage needs to be reduced further, lower `NATS_STREAM_MAX_AGE_HOURS` in `.env`.
If worker redeliveries happen too aggressively under load, increase `NATS_CONSUMER_ACK_WAIT_MS`.
If JetStream is allowed to push more unacked work than the worker should hold at once, lower `NATS_CONSUMER_MAX_ACK_PENDING`.

## Project Structure

```text
src/
  entrypoints/
    api.main.ts
    worker.main.ts
    reports.main.ts

  apps/
    api.app.module.ts
    worker.app.module.ts
    reports.app.module.ts

  contracts/
    v1/
      event.types.ts
      event.schema.ts
      index.ts

  ingestion/
  messaging/
  persistence/
  worker/
  reports/
  health/
  observability/
```

## Why This Design

- Modular monolith keeps complexity under control while preserving clean boundaries.
- Separate entrypoints allow API, Worker, and Reports to run independently.
- NATS JetStream provides durable buffering and smooth burst handling.
- PostgreSQL dedup provides correctness under at-least-once delivery.
- Versioned contracts in `contracts/v1` make future schema evolution safer.

## Event Contract

See `src/contracts/v1` for:

- TypeScript types
- Runtime validation schema

The publisher may send duplicates and out-of-order events, and the system is designed to handle both.
