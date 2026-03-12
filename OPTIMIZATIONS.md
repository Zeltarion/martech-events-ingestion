# Optimization Backlog

This file tracks optional improvements that can strengthen the MarTech event pipeline without expanding the MVP scope too early.

## Keep Out of MVP Unless Time Allows

### Worker Throughput

- Add controlled concurrency for message processing with clear backpressure limits.
- Evaluate batch inserts for higher sustained throughput if single-row inserts become a bottleneck.
- Compare push vs pull consumer behavior if JetStream tuning becomes necessary.

### Dead-letter Flow

- Formalize DLQ handling with a dedicated subject, schema, and replay procedure.
- Add a `dead_events` table or equivalent storage for invalid or poison payloads if operational inspection is needed.
- Document when a message is retried, acked and DLQ'd, or dropped.

### Observability

- Add metrics for ingest rate, persist success and failure, duplicates, redeliveries, and report latency.
- Expose `/metrics` for Prometheus if time permits.
- Add correlation or request IDs across webhook ingest, publish, consume, and persistence logs.
- Surface JetStream consumer lag or stream depth if operational visibility becomes important.

### Replay and Recovery

- Define a safe replay or reprocessing workflow for JetStream consumers.
- Document how dedup guarantees correctness during replay.
- Add an operator-friendly procedure for rebuilding derived analytics if projections are introduced later.

### Storage and Retention

- Define retention or TTL choices for JetStream and Postgres raw events.
- Revisit indexes after real report query patterns are observed.
- Consider materialized views or rollups if report latency becomes a problem.

### Reporting Enhancements

- Add richer analytics endpoints such as top campaigns, device breakdowns, or event trends over time.
- Introduce pagination or cursor-based responses if report result sets grow.
- Make bucket timezone semantics explicit if hourly or daily aggregation needs stricter reporting guarantees.

### Delivery and Startup Hardening

- Add a dedicated migration or init container so schema setup is explicit in Docker Compose.
- Tighten startup sequencing and retry policies for dependent services.
- Add smoke tests covering the end-to-end `docker-compose` path.
