import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { ApiAppModule } from "../apps/api.app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiAppModule);

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();
