import { Module } from "@nestjs/common";

import { MessagingModule } from "../messaging/messaging.module";
import { ObservabilityModule } from "../observability/logger.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { WorkerModule } from "../worker/worker.module";

@Module({
  imports: [
    ObservabilityModule,
    MessagingModule,
    PersistenceModule,
    WorkerModule
  ]
})
export class WorkerAppModule {}
