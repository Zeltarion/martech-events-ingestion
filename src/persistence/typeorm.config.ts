import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from "@nestjs/typeorm";

import { RawEventEntity } from "./entities/raw-event.entity";

export function buildTypeOrmOptions(databaseUrl: string): TypeOrmModuleOptions {
  return {
    type: "postgres",
    url: databaseUrl,
    entities: [RawEventEntity],
    migrations: ["dist/persistence/migrations/*.js"],
    synchronize: false,
    autoLoadEntities: false
  };
}

export const typeOrmModuleOptions: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService): TypeOrmModuleOptions =>
    buildTypeOrmOptions(configService.getOrThrow<string>("app.databaseUrl"))
};
