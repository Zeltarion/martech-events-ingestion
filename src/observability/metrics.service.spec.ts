import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  it("renders worker batch and per-report metrics", () => {
    const metricsService = new MetricsService();

    metricsService.recordWorkerBatch(10, 8, 25);
    metricsService.recordReportRequest("funnel", 15);
    metricsService.recordReportRequest("countries", 20);
    metricsService.recordReportRequest("revenue", 30);

    const rendered = metricsService.renderPrometheus();

    expect(rendered).toContain("mei_worker_batches_total 1");
    expect(rendered).toContain("mei_worker_batch_size_avg 10.000");
    expect(rendered).toContain("mei_reports_funnel_requests_total 1");
    expect(rendered).toContain("mei_reports_countries_requests_total 1");
    expect(rendered).toContain("mei_reports_revenue_requests_total 1");
    expect(rendered).toContain("mei_reports_funnel_duration_ms_avg 15.000");
    expect(rendered).toContain("mei_reports_countries_duration_ms_avg 20.000");
    expect(rendered).toContain("mei_reports_revenue_duration_ms_avg 30.000");
  });
});
