import { Module } from "@nestjs/common";

import { AppConfigModule } from "../config/config.module";
import { HealthModule } from "../health/health.module";
import { IngestionModule } from "../ingestion/ingestion.module";
import { MessagingModule } from "../messaging/messaging.module";
import { ObservabilityModule } from "../observability/logger.module";

@Module({
  imports: [
    AppConfigModule,
    ObservabilityModule,
    MessagingModule,
    IngestionModule,
    HealthModule
  ]
})
export class ApiAppModule {}
