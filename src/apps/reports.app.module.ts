import { Module } from "@nestjs/common";

import { AppConfigModule } from "../config/config.module";
import { HealthModule } from "../health/health.module";
import { ObservabilityModule } from "../observability/observability.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [
    AppConfigModule,
    ObservabilityModule,
    PersistenceModule,
    ReportsModule,
    HealthModule
  ]
})
export class ReportsAppModule {}
