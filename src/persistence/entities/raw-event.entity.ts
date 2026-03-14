import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn
} from "typeorm";

@Entity({ name: "raw_events" })
@Index("idx_raw_events_occurred_at", ["occurredAt"])
@Index("idx_raw_events_source_occurred_at", ["source", "occurredAt"])
@Index("idx_raw_events_event_type_occurred_at", ["eventType", "occurredAt"])
@Index("idx_raw_events_country_occurred_at", ["country", "occurredAt"])
export class RawEventEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  public id!: string;

  @Column({ name: "event_id", type: "text", unique: true })
  public eventId!: string;

  @Column({ name: "occurred_at", type: "timestamptz" })
  public occurredAt!: Date;

  @Column({ type: "text" })
  public source!: string;

  @Column({ name: "funnel_stage", type: "text" })
  public funnelStage!: string;

  @Column({ name: "event_type", type: "text" })
  public eventType!: string;

  @Column({ name: "user_id", type: "text" })
  public userId!: string;

  @Column({ type: "text", nullable: true })
  public country!: string | null;

  @Column({ type: "jsonb" })
  public payload!: Record<string, unknown>;

  @CreateDateColumn({ name: "ingested_at", type: "timestamptz" })
  public ingestedAt!: Date;
}
