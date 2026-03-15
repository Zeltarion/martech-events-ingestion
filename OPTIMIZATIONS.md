# Optimization Backlog

This file tracks optional improvements beyond the completed MVP.

The current MVP already includes:

- bounded concurrency for webhook publishing
- controlled worker concurrency with `ack` after successful persistence
- dedicated migration bootstrap in Docker Compose
- readiness checks for PostgreSQL and NATS
- explicit development guidance for stopping the publisher after integration verification
- correlation IDs across webhook ingress and worker persistence logs
- `/metrics` endpoints plus Prometheus and Grafana in Docker Compose

What remains below is ranked by practical value for this test task.

## Tier 1: Best Return Before Submission

These are the highest-value follow-ups if there is still time after the MVP.

### Worker Throughput

- Evaluate batch inserts if single-row persistence becomes the next real bottleneck.
- Revisit JetStream consumer settings such as `max_ack_pending` and `ack_wait` after observing sustained traffic.
- Compare push vs pull consumer behavior only if current JetStream delivery needs tighter flow control.

### Observability

- Surface JetStream consumer lag or stream depth if operational visibility becomes important.
- Add more focused Grafana panels or alerts only after real operational questions emerge.
- Add richer metrics as a lower-priority follow-up:
  - per-report endpoint counters and latency
  - per-source counters for `facebook` and `tiktok`
  - worker batch size distribution
  - histogram-style latency metrics instead of averages only
  - database persistence timing and retry visibility
  - alerting rules once dashboards stabilize

### Storage and Retention

- Revisit indexes after observing real report query patterns on larger datasets.
- Consider extracting more reporting fields into dedicated columns if JSONB-based report queries become too heavy.
- Add automated Postgres retention, archival, or partitioning only when the MVP outgrows manual volume management.

## Tier 2: Good Backlog, Not Needed For Submission

These improvements are useful, but they add more operational or modeling complexity than the test task needs.

### Dead-letter Flow

- Formalize DLQ handling with a dedicated subject, schema, and replay procedure.
- Add a `dead_events` table or equivalent storage for invalid or poison payloads if operational inspection is needed.
- Document when a message is retried, acked and DLQ'd, or dropped.

### Replay and Recovery

- Define a safe replay or reprocessing workflow for JetStream consumers.
- Document how dedup guarantees correctness during replay.
- Add an operator-friendly procedure for rebuilding derived analytics if projections are introduced later.

### Reporting Enhancements

- Add richer analytics endpoints such as top campaigns, device breakdowns, or event trends over time.
- Introduce pagination or cursor-based responses if report result sets grow.
- Make bucket timezone semantics explicit if hourly or daily aggregation needs stricter reporting guarantees.

## Tier 3: Leave For Later

These are legitimate future improvements, but they are not good trade-offs for this test task unless the scope expands substantially.

### Projection and Rollup Layer

- Add materialized views or rollups if report latency becomes a real problem.
- Introduce aggregate tables only after direct SQL on `raw_events` is no longer sufficient.

### End-to-End Hardening

- Add smoke tests covering the full `docker-compose` path.
- Expand startup retry policies only if local startup or dependency churn proves unstable.

## Notes

- Do not implement everything in this file just because it exists.
- For this assignment, a small number of well-justified optimizations is stronger than a large unfinished backlog.
- The next most defensible improvements are usually observability and storage/retention clarity, not architectural expansion.
