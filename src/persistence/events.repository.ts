import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Event } from "../contracts/v1";
import { RawEventEntity } from "./entities/raw-event.entity";

interface RawEventInsertModel {
  eventId: string;
  occurredAt: Date;
  source: string;
  funnelStage: string;
  eventType: string;
  userId: string;
  country: string | null;
  payload: Record<string, unknown>;
}

@Injectable()
export class EventsRepository {
  public constructor(
    @InjectRepository(RawEventEntity)
    private readonly rawEventRepository: Repository<RawEventEntity>
  ) {}

  public async insertEvent(event: Event): Promise<boolean> {
    const model = this.mapEventToInsertModel(event);
    const insertResult = await this.rawEventRepository.query(
      `
        INSERT INTO raw_events (
          event_id,
          occurred_at,
          source,
          funnel_stage,
          event_type,
          user_id,
          country,
          payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      `,
      [
        model.eventId,
        model.occurredAt,
        model.source,
        model.funnelStage,
        model.eventType,
        model.userId,
        model.country,
        JSON.stringify(model.payload)
      ]
    );

    return Array.isArray(insertResult) && insertResult.length > 0;
  }

  private mapEventToInsertModel(event: Event): RawEventInsertModel {
    return {
      eventId: event.eventId,
      occurredAt: new Date(event.timestamp),
      source: event.source,
      funnelStage: event.funnelStage,
      eventType: event.eventType,
      userId: event.data.user.userId,
      country: this.extractCountry(event),
      payload: event as unknown as Record<string, unknown>
    };
  }

  private extractCountry(event: Event): string | null {
    if (event.source === "facebook") {
      return event.data.user.location.country;
    }

    if (event.source === "tiktok") {
      return this.extractTiktokCountry(event);
    }

    return null;
  }

  private extractTiktokCountry(event: Extract<Event, { source: "tiktok" }>): string | null {
    if (event.funnelStage !== "top") {
      return null;
    }

    if (!("country" in event.data.engagement)) {
      return null;
    }

    return event.data.engagement.country;
  }
}
