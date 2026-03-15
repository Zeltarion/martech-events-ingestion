import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AckPolicy,
  connect,
  consumerOpts,
  headers,
  JetStreamClient,
  JetStreamManager,
  NatsConnection,
  StringCodec
} from "nats";

import { Event } from "../contracts/v1";
import { AppConfig } from "../config/configuration";

@Injectable()
export class NatsService implements OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private readonly codec = StringCodec();

  private connectionPromise: Promise<NatsConnection> | null = null;
  private jetStreamPromise: Promise<JetStreamClient> | null = null;
  private jetStreamManagerPromise: Promise<JetStreamManager> | null = null;

  public constructor(private readonly configService: ConfigService<{ app: AppConfig }, true>) {}

  public async publishEvent(subject: string, event: Event, metadata?: { requestId?: string }): Promise<void> {
    const jetStream = await this.getJetStreamClient();
    const natsHeaders = headers();

    if (metadata?.requestId) {
      natsHeaders.set("x-request-id", metadata.requestId);
    }

    await jetStream.publish(subject, this.codec.encode(JSON.stringify(event)), {
      msgID: event.eventId,
      headers: natsHeaders
    });
  }

  public encodeJson(value: unknown): Uint8Array {
    return this.codec.encode(JSON.stringify(value));
  }

  public decodeJson<T>(payload: Uint8Array): T {
    return JSON.parse(this.codec.decode(payload)) as T;
  }

  public async buildConsumerOptions(durableName: string, subject: string) {
    const appConfig = this.configService.getOrThrow("app");
    const options = consumerOpts();

    options.durable(durableName);
    options.manualAck();
    options.ackExplicit();
    options.deliverTo(`${durableName}.deliver`);
    options.filterSubject(subject);
    options.ackWait(appConfig.natsConsumerAckWaitMs);
    options.maxDeliver(10);
    options.maxAckPending(appConfig.natsConsumerMaxAckPending);

    return options;
  }

  public async getConnection(): Promise<NatsConnection> {
    if (!this.connectionPromise) {
      const appConfig = this.configService.getOrThrow("app");

      this.connectionPromise = connect({
        servers: appConfig.natsUrl
      });
    }

    return this.connectionPromise;
  }

  public async getJetStreamClient(): Promise<JetStreamClient> {
    if (!this.jetStreamPromise) {
      this.jetStreamPromise = this.getConnection().then((connection) => connection.jetstream());
    }

    return this.jetStreamPromise;
  }

  public async getJetStreamManager(): Promise<JetStreamManager> {
    if (!this.jetStreamManagerPromise) {
      this.jetStreamManagerPromise = this.getConnection().then((connection) => connection.jetstreamManager());
    }

    return this.jetStreamManagerPromise;
  }

  public async onModuleDestroy(): Promise<void> {
    const connection = await this.connectionPromise;

    if (connection) {
      this.logger.log("Closing NATS connection");
      await connection.drain();
    }
  }
}
