import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";

import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  @Get("liveness")
  public getLiveness(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("readiness")
  public async getReadiness(): Promise<{
    status: "ok" | "disabled";
    checks: {
      postgres: "up" | "down";
      nats: "up" | "down";
    };
  }> {
    const readiness = await this.healthService.getReadiness();

    if (readiness.status === "degraded") {
      throw new ServiceUnavailableException(readiness);
    }

    return {
      status: readiness.status,
      checks: readiness.checks
    };
  }
}
