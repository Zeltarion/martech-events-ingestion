import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { AppConfig } from "../config/configuration";
import { NatsService } from "../messaging/nats.service";

@Injectable()
export class HealthService {
  public constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly natsService: NatsService,
    private readonly configService: ConfigService<{ app: AppConfig }, true>
  ) {}

  public async getReadiness(): Promise<{
    status: "ok" | "degraded" | "disabled";
    checks: {
      postgres: "up" | "down";
      nats: "up" | "down";
    };
  }> {
    const appConfig = this.configService.getOrThrow("app");

    if (!appConfig.readinessEnabled) {
      return {
        status: "disabled",
        checks: {
          postgres: "down",
          nats: "down"
        }
      };
    }

    const [postgresReady, natsReady] = await Promise.all([
      this.checkPostgres(),
      this.checkNats()
    ]);

    return {
      status: postgresReady && natsReady ? "ok" : "degraded",
      checks: {
        postgres: postgresReady ? "up" : "down",
        nats: natsReady ? "up" : "down"
      }
    };
  }

  private async checkPostgres(): Promise<boolean> {
    try {
      await this.dataSource.query("SELECT 1");

      return true;
    } catch {
      return false;
    }
  }

  private async checkNats(): Promise<boolean> {
    try {
      const connection = await this.natsService.getConnection();

      await connection.flush();

      return true;
    } catch {
      return false;
    }
  }
}
