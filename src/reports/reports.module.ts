import { Module } from "@nestjs/common";

import { PersistenceModule } from "../persistence/persistence.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [PersistenceModule],
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
