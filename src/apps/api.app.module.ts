import { Module } from "@nestjs/common";

import { HealthModule } from "../health/health.module";
import { IngestionModule } from "../ingestion/ingestion.module";
import { MessagingModule } from "../messaging/messaging.module";
import { ObservabilityModule } from "../observability/logger.module";

@Module({
  imports: [
    ObservabilityModule,
    MessagingModule,
    IngestionModule,
    HealthModule
  ]
})
export class ApiAppModule {}
