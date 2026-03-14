import "reflect-metadata";

import { DataSource } from "typeorm";

import configuration from "../config/configuration";
import { RawEventEntity } from "./entities/raw-event.entity";

const appConfig = configuration().app;

export default new DataSource({
  type: "postgres",
  url: appConfig.databaseUrl,
  entities: [RawEventEntity],
  migrations: ["dist/persistence/migrations/*.js"],
  synchronize: false
});
