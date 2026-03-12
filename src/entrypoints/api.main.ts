import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";

import { ApiAppModule } from "../apps/api.app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiAppModule);
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  await app.listen(port);

  new Logger("ApiBootstrap").log(`API listening on port ${port}`);
}

void bootstrap();
