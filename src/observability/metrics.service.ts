import { Injectable } from "@nestjs/common";

interface CounterMap {
  webhookRequestsTotal: number;
  webhookEventsReceivedTotal: number;
  webhookPublishFailuresTotal: number;
  workerBatchesTotal: number;
  workerMessagesProcessedTotal: number;
  workerMessagesInsertedTotal: number;
  workerMessagesDuplicateTotal: number;
  workerProcessingFailuresTotal: number;
  workerDlqMessagesTotal: number;
  reportsRequestsTotal: number;
  reportsFunnelRequestsTotal: number;
  reportsCountriesRequestsTotal: number;
  reportsRevenueRequestsTotal: number;
}

interface DurationMap {
  webhookPublishDurationMsTotal: number;
  workerBatchDurationMsTotal: number;
  reportsDurationMsTotal: number;
  reportsFunnelDurationMsTotal: number;
  reportsCountriesDurationMsTotal: number;
  reportsRevenueDurationMsTotal: number;
}

@Injectable()
export class MetricsService {
  private readonly processStartTimeSeconds = Math.floor(Date.now() / 1000);
  private readonly counters: CounterMap = {
    webhookRequestsTotal: 0,
    webhookEventsReceivedTotal: 0,
    webhookPublishFailuresTotal: 0,
    workerBatchesTotal: 0,
    workerMessagesProcessedTotal: 0,
    workerMessagesInsertedTotal: 0,
    workerMessagesDuplicateTotal: 0,
    workerProcessingFailuresTotal: 0,
    workerDlqMessagesTotal: 0,
    reportsRequestsTotal: 0,
    reportsFunnelRequestsTotal: 0,
    reportsCountriesRequestsTotal: 0,
    reportsRevenueRequestsTotal: 0
  };

  private readonly durations: DurationMap = {
    webhookPublishDurationMsTotal: 0,
    workerBatchDurationMsTotal: 0,
    reportsDurationMsTotal: 0,
    reportsFunnelDurationMsTotal: 0,
    reportsCountriesDurationMsTotal: 0,
    reportsRevenueDurationMsTotal: 0
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
    this.counters.workerBatchesTotal += 1;
    this.counters.workerMessagesProcessedTotal += processedCount;
    this.counters.workerMessagesInsertedTotal += insertedCount;
    this.counters.workerMessagesDuplicateTotal += processedCount - insertedCount;
    this.durations.workerBatchDurationMsTotal += durationMs;
  }

  public recordWorkerFailure(): void {
    this.counters.workerProcessingFailuresTotal += 1;
  }

  public recordWorkerDlqMessage(): void {
    this.counters.workerDlqMessagesTotal += 1;
  }

  public recordReportRequest(reportType: "funnel" | "countries" | "revenue", durationMs: number): void {
    this.counters.reportsRequestsTotal += 1;
    this.durations.reportsDurationMsTotal += durationMs;

    if (reportType === "funnel") {
      this.counters.reportsFunnelRequestsTotal += 1;
      this.durations.reportsFunnelDurationMsTotal += durationMs;
      return;
    }

    if (reportType === "countries") {
      this.counters.reportsCountriesRequestsTotal += 1;
      this.durations.reportsCountriesDurationMsTotal += durationMs;
      return;
    }

    this.counters.reportsRevenueRequestsTotal += 1;
    this.durations.reportsRevenueDurationMsTotal += durationMs;
  }

  public renderPrometheus(): string {
    const avgWebhookPublishDurationMs = this.calculateAverage(
      this.durations.webhookPublishDurationMsTotal,
      this.counters.webhookRequestsTotal
    );
    const avgWorkerBatchDurationMs = this.calculateAverage(
      this.durations.workerBatchDurationMsTotal,
      this.counters.workerBatchesTotal
    );
    const avgWorkerBatchSize = this.calculateAverage(
      this.counters.workerMessagesProcessedTotal,
      this.counters.workerBatchesTotal
    );
    const avgReportsDurationMs = this.calculateAverage(
      this.durations.reportsDurationMsTotal,
      this.counters.reportsRequestsTotal
    );
    const avgReportsFunnelDurationMs = this.calculateAverage(
      this.durations.reportsFunnelDurationMsTotal,
      this.counters.reportsFunnelRequestsTotal
    );
    const avgReportsCountriesDurationMs = this.calculateAverage(
      this.durations.reportsCountriesDurationMsTotal,
      this.counters.reportsCountriesRequestsTotal
    );
    const avgReportsRevenueDurationMs = this.calculateAverage(
      this.durations.reportsRevenueDurationMsTotal,
      this.counters.reportsRevenueRequestsTotal
    );

    return [
      "# TYPE mei_process_start_time_seconds gauge",
      `mei_process_start_time_seconds ${this.processStartTimeSeconds}`,
      "# TYPE mei_webhook_requests_total counter",
      `mei_webhook_requests_total ${this.counters.webhookRequestsTotal}`,
      "# TYPE mei_webhook_events_received_total counter",
      `mei_webhook_events_received_total ${this.counters.webhookEventsReceivedTotal}`,
      "# TYPE mei_webhook_publish_failures_total counter",
      `mei_webhook_publish_failures_total ${this.counters.webhookPublishFailuresTotal}`,
      "# TYPE mei_worker_batches_total counter",
      `mei_worker_batches_total ${this.counters.workerBatchesTotal}`,
      "# TYPE mei_worker_messages_processed_total counter",
      `mei_worker_messages_processed_total ${this.counters.workerMessagesProcessedTotal}`,
      "# TYPE mei_worker_messages_inserted_total counter",
      `mei_worker_messages_inserted_total ${this.counters.workerMessagesInsertedTotal}`,
      "# TYPE mei_worker_messages_duplicate_total counter",
      `mei_worker_messages_duplicate_total ${this.counters.workerMessagesDuplicateTotal}`,
      "# TYPE mei_worker_processing_failures_total counter",
      `mei_worker_processing_failures_total ${this.counters.workerProcessingFailuresTotal}`,
      "# TYPE mei_worker_dlq_messages_total counter",
      `mei_worker_dlq_messages_total ${this.counters.workerDlqMessagesTotal}`,
      "# TYPE mei_reports_requests_total counter",
      `mei_reports_requests_total ${this.counters.reportsRequestsTotal}`,
      "# TYPE mei_reports_funnel_requests_total counter",
      `mei_reports_funnel_requests_total ${this.counters.reportsFunnelRequestsTotal}`,
      "# TYPE mei_reports_countries_requests_total counter",
      `mei_reports_countries_requests_total ${this.counters.reportsCountriesRequestsTotal}`,
      "# TYPE mei_reports_revenue_requests_total counter",
      `mei_reports_revenue_requests_total ${this.counters.reportsRevenueRequestsTotal}`,
      "# TYPE mei_webhook_publish_duration_ms_avg gauge",
      `mei_webhook_publish_duration_ms_avg ${avgWebhookPublishDurationMs.toFixed(3)}`,
      "# TYPE mei_worker_batch_duration_ms_avg gauge",
      `mei_worker_batch_duration_ms_avg ${avgWorkerBatchDurationMs.toFixed(3)}`,
      "# TYPE mei_worker_batch_size_avg gauge",
      `mei_worker_batch_size_avg ${avgWorkerBatchSize.toFixed(3)}`,
      "# TYPE mei_reports_duration_ms_avg gauge",
      `mei_reports_duration_ms_avg ${avgReportsDurationMs.toFixed(3)}`,
      "# TYPE mei_reports_funnel_duration_ms_avg gauge",
      `mei_reports_funnel_duration_ms_avg ${avgReportsFunnelDurationMs.toFixed(3)}`,
      "# TYPE mei_reports_countries_duration_ms_avg gauge",
      `mei_reports_countries_duration_ms_avg ${avgReportsCountriesDurationMs.toFixed(3)}`,
      "# TYPE mei_reports_revenue_duration_ms_avg gauge",
      `mei_reports_revenue_duration_ms_avg ${avgReportsRevenueDurationMs.toFixed(3)}`
    ].join("\n");
  }

  private calculateAverage(total: number, count: number): number {
    return count === 0 ? 0 : total / count;
  }
}
