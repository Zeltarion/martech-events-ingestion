import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AckPolicy, DeliverPolicy, DiscardPolicy, RetentionPolicy, nanos } from "nats";

import { AppConfig } from "../config/configuration";
import { NatsService } from "./nats.service";

@Injectable()
export class StreamBootstrapService {
  private readonly logger = new Logger(StreamBootstrapService.name);

  public constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService<{ app: AppConfig }, true>
  ) {}

  public async ensureStreamAndConsumer(): Promise<void> {
    const manager = await this.natsService.getJetStreamManager();
    const appConfig = this.configService.getOrThrow("app");
    const streamName = appConfig.natsStreamName;
    const ingestSubject = appConfig.natsIngestSubject;
    const durableName = appConfig.natsDurableName;
    const deliverSubject = `${durableName}.deliver`;
    const maxAgeNanos = nanos(appConfig.natsStreamMaxAgeHours * 60 * 60 * 1000);

    try {
      const streamInfo = await manager.streams.info(streamName);

      if (
        streamInfo.config.max_age !== maxAgeNanos ||
        streamInfo.config.subjects?.join(",") !== [ingestSubject].join(",")
      ) {
        await manager.streams.update(streamName, {
          subjects: [ingestSubject],
          max_age: maxAgeNanos
        });

        this.logger.log(
          `Updated stream ${streamName} retention maxAgeHours=${appConfig.natsStreamMaxAgeHours}`
        );
      }
    } catch {
      await manager.streams.add({
        name: streamName,
        subjects: [ingestSubject],
        max_age: maxAgeNanos,
        retention: RetentionPolicy.Limits,
        discard: DiscardPolicy.Old
      });

      this.logger.log(
        `Created stream ${streamName} with retention maxAgeHours=${appConfig.natsStreamMaxAgeHours}`
      );
    }

    try {
      const consumerInfo = await manager.consumers.info(streamName, durableName);

      if (consumerInfo.config.deliver_subject !== deliverSubject) {
        await manager.consumers.delete(streamName, durableName);

        this.logger.warn(`Recreated durable consumer ${durableName} to align deliver_subject`);
        await this.createConsumer(streamName, durableName, ingestSubject, deliverSubject);
      }
    } catch {
      await this.createConsumer(streamName, durableName, ingestSubject, deliverSubject);
    }
  }

  private async createConsumer(
    streamName: string,
    durableName: string,
    ingestSubject: string,
    deliverSubject: string
  ): Promise<void> {
    const manager = await this.natsService.getJetStreamManager();

    await manager.consumers.add(streamName, {
      durable_name: durableName,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      deliver_subject: deliverSubject,
      ack_wait: 30_000_000_000,
      max_deliver: 10,
      max_ack_pending: 1_000,
      filter_subject: ingestSubject
    });

    this.logger.log(`Created durable consumer ${durableName}`);
  }
}
