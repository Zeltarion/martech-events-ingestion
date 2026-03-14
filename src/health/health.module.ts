import { Module } from "@nestjs/common";

import { MessagingModule } from "../messaging/messaging.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [PersistenceModule, MessagingModule],
  controllers: [HealthController],
  providers: [HealthService]
})
export class HealthModule {}
