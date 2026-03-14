import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { ReportsAppModule } from "../apps/reports.app.module";
import { buildNestLogger, logBootstrap } from "../bootstrap/bootstrap.util";

async function bootstrap(): Promise<void> {
  const port = process.env.REPORTS_PORT ? Number(process.env.REPORTS_PORT) : 3001;
  const app = await NestFactory.create(ReportsAppModule, {
    logger: buildNestLogger(process.env.LOG_LEVEL)
  });
  app.enableShutdownHooks();

  await app.listen(port);
  logBootstrap("Reports", port);
}

void bootstrap();
