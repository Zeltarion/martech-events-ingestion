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
  purchaseAmount: string | null;
  payload: Record<string, unknown>;
}

export interface ReportFilters {
  from: string;
  to: string;
  source?: Event["source"];
}

export interface CountriesReportFilters extends ReportFilters {
  limit: number;
}

export interface RevenueReportFilters extends ReportFilters {
  groupBy: "day" | "hour";
}

@Injectable()
export class EventsRepository {
  public constructor(
    @InjectRepository(RawEventEntity)
    private readonly rawEventRepository: Repository<RawEventEntity>
  ) {}

  public async insertEvent(event: Event): Promise<boolean> {
    const model = this.mapEventToInsertModel(event);
    const insertedEventIds = await this.insertModels([model]);

    return insertedEventIds.has(model.eventId);
  }

  public async insertEvents(events: Event[]): Promise<Set<string>> {
    if (events.length === 0) {
      return new Set<string>();
    }

    const models = deduplicateInsertModels(events.map((event) => this.mapEventToInsertModel(event)));

    return this.insertModels(models);
  }

  public async getFunnelReport(filters: ReportFilters): Promise<{
    topCount: number;
    bottomCount: number;
  }> {
    const [row] = await this.rawEventRepository.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE funnel_stage = 'top')::int AS "topCount",
          COUNT(*) FILTER (WHERE funnel_stage = 'bottom')::int AS "bottomCount"
        FROM raw_events
        WHERE occurred_at >= $1
          AND occurred_at < $2
          AND ($3::text IS NULL OR source = $3)
      `,
      [filters.from, filters.to, filters.source ?? null]
    );

    return {
      topCount: Number(row?.topCount ?? 0),
      bottomCount: Number(row?.bottomCount ?? 0)
    };
  }

  public async getCountriesReport(filters: CountriesReportFilters): Promise<
    Array<{ country: string; eventsCount: number; uniqueUsers: number }>
  > {
    const rows = await this.rawEventRepository.query(
      `
        SELECT
          country,
          COUNT(*)::int AS "eventsCount",
          COUNT(DISTINCT user_id)::int AS "uniqueUsers"
        FROM raw_events
        WHERE occurred_at >= $1
          AND occurred_at < $2
          AND ($3::text IS NULL OR source = $3)
          AND country IS NOT NULL
        GROUP BY country
        ORDER BY COUNT(*) DESC, country ASC
        LIMIT $4
      `,
      [filters.from, filters.to, filters.source ?? null, filters.limit]
    );

    return rows.map((row: Record<string, unknown>) => ({
      country: String(row.country),
      eventsCount: Number(row.eventsCount),
      uniqueUsers: Number(row.uniqueUsers)
    }));
  }

  public async getRevenueReport(filters: RevenueReportFilters): Promise<
    Array<{ bucket: string; revenue: string }>
  > {
    const bucketPrecision = filters.groupBy;
    const bucketFormat =
      filters.groupBy === "day"
        ? "YYYY-MM-DD"
        : "YYYY-MM-DD\"T\"HH24:00:00\"Z\"";
    const rows = await this.rawEventRepository.query(
      `
        WITH revenue_events AS (
          SELECT
            date_trunc('${bucketPrecision}', occurred_at AT TIME ZONE 'UTC') AS bucket,
            purchase_amount AS revenue_amount
          FROM raw_events
          WHERE occurred_at >= $1
            AND occurred_at < $2
            AND ($3::text IS NULL OR source = $3)
        )
        SELECT
          to_char(bucket, '${bucketFormat}') AS bucket,
          COALESCE(SUM(revenue_amount), 0)::text AS revenue
        FROM revenue_events
        WHERE revenue_amount IS NOT NULL
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      [filters.from, filters.to, filters.source ?? null]
    );

    return rows.map((row: Record<string, unknown>) => ({
      bucket: String(row.bucket),
      revenue: String(row.revenue)
    }));
  }

  private mapEventToInsertModel(event: Event): RawEventInsertModel {
    return mapEventToInsertModel(event);
  }

  private extractCountry(event: Event): string | null {
    return extractCountry(event);
  }

  private async insertModels(models: RawEventInsertModel[]): Promise<Set<string>> {
    if (models.length === 0) {
      return new Set<string>();
    }

    const values: unknown[] = [];
    const placeholders = models.map((model, index) => {
      const offset = index * 9;

      values.push(
        model.eventId,
        model.occurredAt,
        model.source,
        model.funnelStage,
        model.eventType,
        model.userId,
        model.country,
        model.purchaseAmount,
        JSON.stringify(model.payload)
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}::jsonb)`;
    });

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
          purchase_amount,
          payload
        )
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      `,
      values
    );

    return new Set(
      Array.isArray(insertResult)
        ? insertResult.map((row: Record<string, unknown>) => String(row.event_id))
        : []
    );
  }
}

export function mapEventToInsertModel(event: Event): RawEventInsertModel {
  return {
    eventId: event.eventId,
    occurredAt: new Date(event.timestamp),
    source: event.source,
    funnelStage: event.funnelStage,
    eventType: event.eventType,
    userId: event.data.user.userId,
    country: extractCountry(event),
    purchaseAmount: extractPurchaseAmount(event),
    payload: event as unknown as Record<string, unknown>
  };
}

function extractCountry(event: Event): string | null {
  if (event.source === "facebook") {
    return event.data.user.location.country;
  }

  if (event.source === "tiktok") {
    return extractTiktokCountry(event);
  }

  return null;
}

function extractTiktokCountry(event: Extract<Event, { source: "tiktok" }>): string | null {
  if (event.funnelStage !== "top") {
    return null;
  }

  if (!("country" in event.data.engagement)) {
    return null;
  }

  return event.data.engagement.country;
}

function deduplicateInsertModels(models: RawEventInsertModel[]): RawEventInsertModel[] {
  const uniqueModels = new Map<string, RawEventInsertModel>();

  for (const model of models) {
    if (!uniqueModels.has(model.eventId)) {
      uniqueModels.set(model.eventId, model);
    }
  }

  return Array.from(uniqueModels.values());
}

export function extractPurchaseAmount(event: Event): string | null {
  if (!("purchaseAmount" in event.data.engagement)) {
    return null;
  }

  const { purchaseAmount } = event.data.engagement;

  if (typeof purchaseAmount !== "string") {
    return null;
  }

  return /^[0-9]+(\.[0-9]+)?$/.test(purchaseAmount) ? purchaseAmount : null;
}
