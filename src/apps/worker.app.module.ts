import { Module } from "@nestjs/common";

import { AppConfigModule } from "../config/config.module";
import { MessagingModule } from "../messaging/messaging.module";
import { ObservabilityModule } from "../observability/observability.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { WorkerModule } from "../worker/worker.module";

@Module({
  imports: [
    AppConfigModule,
    ObservabilityModule,
    MessagingModule,
    PersistenceModule,
    WorkerModule
  ]
})
export class WorkerAppModule {}
