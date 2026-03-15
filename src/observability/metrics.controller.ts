import { Controller, Get, Header } from "@nestjs/common";

import { MetricsService } from "./metrics.service";

@Controller()
export class MetricsController {
  public constructor(private readonly metricsService: MetricsService) {}

  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  public getMetrics(): string {
    return this.metricsService.renderPrometheus();
  }
}
