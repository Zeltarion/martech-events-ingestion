import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { WorkerAppModule } from "../apps/worker.app.module";
import { buildNestLogger, logBootstrap } from "../bootstrap/bootstrap.util";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: buildNestLogger(process.env.LOG_LEVEL)
  });

  app.enableShutdownHooks();
  logBootstrap("Worker");
}

void bootstrap();
