import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";

import { ApiAppModule } from "../apps/api.app.module";
import { buildNestLogger, logBootstrap } from "../bootstrap/bootstrap.util";

async function bootstrap(): Promise<void> {
  const logLevel = process.env.LOG_LEVEL;
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const app = await NestFactory.create(ApiAppModule, {
    logger: buildNestLogger(logLevel)
  });

  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));
  app.enableShutdownHooks();

  await app.listen(port);

  logBootstrap("API", port);
}

void bootstrap();
