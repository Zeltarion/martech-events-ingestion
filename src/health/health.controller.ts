import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get("liveness")
  public getLiveness(): { status: "ok" } {
    return { status: "ok" };
  }
}
