import { Module } from "@nestjs/common";

import { NatsService } from "./nats.service";
import { StreamBootstrapService } from "./stream.bootstrap";

@Module({
  providers: [NatsService, StreamBootstrapService],
  exports: [NatsService, StreamBootstrapService]
})
export class MessagingModule {}
