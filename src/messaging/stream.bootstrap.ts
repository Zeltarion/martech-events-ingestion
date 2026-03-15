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
    const dlqSubject = appConfig.natsDlqSubject;
    const durableName = appConfig.natsDurableName;
    const deliverSubject = `${durableName}.deliver`;
    const maxAgeNanos = nanos(appConfig.natsStreamMaxAgeHours * 60 * 60 * 1000);
    const expectedSubjects = [ingestSubject, dlqSubject];

    try {
      const streamInfo = await manager.streams.info(streamName);

      if (
        streamInfo.config.max_age !== maxAgeNanos ||
        streamInfo.config.subjects?.join(",") !== expectedSubjects.join(",")
      ) {
        await manager.streams.update(streamName, {
          subjects: expectedSubjects,
          max_age: maxAgeNanos
        });

        this.logger.log(
          `Updated stream ${streamName} retention maxAgeHours=${appConfig.natsStreamMaxAgeHours}`
        );
      }
    } catch {
      await manager.streams.add({
        name: streamName,
        subjects: expectedSubjects,
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

      if (this.needsConsumerRecreation(consumerInfo.config, deliverSubject, ingestSubject, appConfig)) {
        await manager.consumers.delete(streamName, durableName);

        this.logger.warn(`Recreated durable consumer ${durableName} to align delivery settings`);
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
    const appConfig = this.configService.getOrThrow("app");

    await manager.consumers.add(streamName, {
      durable_name: durableName,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      deliver_subject: deliverSubject,
      ack_wait: nanos(appConfig.natsConsumerAckWaitMs),
      max_deliver: 10,
      max_ack_pending: appConfig.natsConsumerMaxAckPending,
      filter_subject: ingestSubject
    });

    this.logger.log(`Created durable consumer ${durableName}`);
  }

  private needsConsumerRecreation(
    consumerConfig: {
      deliver_subject?: string;
      filter_subject?: string;
      ack_wait?: number;
      max_deliver?: number;
      max_ack_pending?: number;
    },
    deliverSubject: string,
    ingestSubject: string,
    appConfig: AppConfig
  ): boolean {
    return (
      consumerConfig.deliver_subject !== deliverSubject ||
      consumerConfig.filter_subject !== ingestSubject ||
      consumerConfig.ack_wait !== nanos(appConfig.natsConsumerAckWaitMs) ||
      consumerConfig.max_deliver !== 10 ||
      consumerConfig.max_ack_pending !== appConfig.natsConsumerMaxAckPending
    );
  }
}
