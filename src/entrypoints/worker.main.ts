import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { WorkerAppModule } from "../apps/worker.app.module";
import { buildNestLogger, logBootstrap } from "../bootstrap/bootstrap.util";

async function bootstrap(): Promise<void> {
  const port = process.env.WORKER_PORT ? Number(process.env.WORKER_PORT) : 3002;
  const app = await NestFactory.create(WorkerAppModule, {
    logger: buildNestLogger(process.env.LOG_LEVEL)
  });

  app.enableShutdownHooks();
  await app.listen(port);
  logBootstrap("Worker", port);
}

void bootstrap();
