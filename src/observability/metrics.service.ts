import { Injectable } from "@nestjs/common";

interface CounterMap {
  webhookRequestsTotal: number;
  webhookEventsReceivedTotal: number;
  webhookPublishFailuresTotal: number;
  workerMessagesProcessedTotal: number;
  workerMessagesInsertedTotal: number;
  workerMessagesDuplicateTotal: number;
  workerProcessingFailuresTotal: number;
  reportsRequestsTotal: number;
}

interface DurationMap {
  webhookPublishDurationMsTotal: number;
  workerBatchDurationMsTotal: number;
  reportsDurationMsTotal: number;
}

@Injectable()
export class MetricsService {
  private readonly processStartTimeSeconds = Math.floor(Date.now() / 1000);
  private readonly counters: CounterMap = {
    webhookRequestsTotal: 0,
    webhookEventsReceivedTotal: 0,
    webhookPublishFailuresTotal: 0,
    workerMessagesProcessedTotal: 0,
    workerMessagesInsertedTotal: 0,
    workerMessagesDuplicateTotal: 0,
    workerProcessingFailuresTotal: 0,
    reportsRequestsTotal: 0
  };

  private readonly durations: DurationMap = {
    webhookPublishDurationMsTotal: 0,
    workerBatchDurationMsTotal: 0,
    reportsDurationMsTotal: 0
  };

  public recordWebhookRequest(eventsCount: number, durationMs: number): void {
    this.counters.webhookRequestsTotal += 1;
    this.counters.webhookEventsReceivedTotal += eventsCount;
    this.durations.webhookPublishDurationMsTotal += durationMs;
  }

  public recordWebhookPublishFailure(): void {
    this.counters.webhookPublishFailuresTotal += 1;
  }

  public recordWorkerBatch(processedCount: number, insertedCount: number, durationMs: number): void {
    this.counters.workerMessagesProcessedTotal += processedCount;
    this.counters.workerMessagesInsertedTotal += insertedCount;
    this.counters.workerMessagesDuplicateTotal += processedCount - insertedCount;
    this.durations.workerBatchDurationMsTotal += durationMs;
  }

  public recordWorkerFailure(): void {
    this.counters.workerProcessingFailuresTotal += 1;
  }

  public recordReportRequest(durationMs: number): void {
    this.counters.reportsRequestsTotal += 1;
    this.durations.reportsDurationMsTotal += durationMs;
  }

  public renderPrometheus(): string {
    const avgWebhookPublishDurationMs =
      this.counters.webhookRequestsTotal === 0
        ? 0
        : this.durations.webhookPublishDurationMsTotal / this.counters.webhookRequestsTotal;
    const avgWorkerBatchDurationMs =
      this.counters.workerMessagesProcessedTotal === 0
        ? 0
        : this.durations.workerBatchDurationMsTotal /
          Math.max(1, this.counters.workerMessagesInsertedTotal + this.counters.workerMessagesDuplicateTotal);
    const avgReportsDurationMs =
      this.counters.reportsRequestsTotal === 0
        ? 0
        : this.durations.reportsDurationMsTotal / this.counters.reportsRequestsTotal;

    return [
      "# TYPE mei_process_start_time_seconds gauge",
      `mei_process_start_time_seconds ${this.processStartTimeSeconds}`,
      "# TYPE mei_webhook_requests_total counter",
      `mei_webhook_requests_total ${this.counters.webhookRequestsTotal}`,
      "# TYPE mei_webhook_events_received_total counter",
      `mei_webhook_events_received_total ${this.counters.webhookEventsReceivedTotal}`,
      "# TYPE mei_webhook_publish_failures_total counter",
      `mei_webhook_publish_failures_total ${this.counters.webhookPublishFailuresTotal}`,
      "# TYPE mei_worker_messages_processed_total counter",
      `mei_worker_messages_processed_total ${this.counters.workerMessagesProcessedTotal}`,
      "# TYPE mei_worker_messages_inserted_total counter",
      `mei_worker_messages_inserted_total ${this.counters.workerMessagesInsertedTotal}`,
      "# TYPE mei_worker_messages_duplicate_total counter",
      `mei_worker_messages_duplicate_total ${this.counters.workerMessagesDuplicateTotal}`,
      "# TYPE mei_worker_processing_failures_total counter",
      `mei_worker_processing_failures_total ${this.counters.workerProcessingFailuresTotal}`,
      "# TYPE mei_reports_requests_total counter",
      `mei_reports_requests_total ${this.counters.reportsRequestsTotal}`,
      "# TYPE mei_webhook_publish_duration_ms_avg gauge",
      `mei_webhook_publish_duration_ms_avg ${avgWebhookPublishDurationMs.toFixed(3)}`,
      "# TYPE mei_worker_message_duration_ms_avg gauge",
      `mei_worker_message_duration_ms_avg ${avgWorkerBatchDurationMs.toFixed(3)}`,
      "# TYPE mei_reports_duration_ms_avg gauge",
      `mei_reports_duration_ms_avg ${avgReportsDurationMs.toFixed(3)}`
    ].join("\n");
  }
}
