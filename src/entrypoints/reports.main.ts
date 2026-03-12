import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { ReportsAppModule } from "../apps/reports.app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ReportsAppModule);

  await app.listen(process.env.REPORTS_PORT ? Number(process.env.REPORTS_PORT) : 3001);
}

void bootstrap();
