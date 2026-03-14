import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EventsRepository } from "./events.repository";
import { RawEventEntity } from "./entities/raw-event.entity";
import { typeOrmModuleOptions } from "./typeorm.config";

@Module({
  imports: [
    TypeOrmModule.forRootAsync(typeOrmModuleOptions),
    TypeOrmModule.forFeature([RawEventEntity])
  ],
  providers: [EventsRepository],
  exports: [EventsRepository, TypeOrmModule]
})
export class PersistenceModule {}
