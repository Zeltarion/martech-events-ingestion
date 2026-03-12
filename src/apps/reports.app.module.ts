import { Module } from "@nestjs/common";

import { HealthModule } from "../health/health.module";
import { ObservabilityModule } from "../observability/logger.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [
    ObservabilityModule,
    PersistenceModule,
    ReportsModule,
    HealthModule
  ]
})
export class ReportsAppModule {}
