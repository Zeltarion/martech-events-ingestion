import { Module } from "@nestjs/common";

import { MessagingModule } from "../messaging/messaging.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { ConsumerService } from "./consumer.service";

@Module({
  imports: [MessagingModule, PersistenceModule],
  providers: [ConsumerService]
})
export class WorkerModule {}
