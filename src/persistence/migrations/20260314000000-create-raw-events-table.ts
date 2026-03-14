import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRawEventsTable20260314000000 implements MigrationInterface {
  public readonly name = "CreateRawEventsTable20260314000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "raw_events" (
        "id" BIGSERIAL NOT NULL,
        "event_id" TEXT NOT NULL,
        "occurred_at" TIMESTAMPTZ NOT NULL,
        "source" TEXT NOT NULL,
        "funnel_stage" TEXT NOT NULL,
        "event_type" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "country" TEXT,
        "payload" JSONB NOT NULL,
        "ingested_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_raw_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_raw_events_event_id" UNIQUE ("event_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_raw_events_occurred_at" ON "raw_events" ("occurred_at")`);
    await queryRunner.query(`CREATE INDEX "idx_raw_events_source_occurred_at" ON "raw_events" ("source", "occurred_at")`);
    await queryRunner.query(`CREATE INDEX "idx_raw_events_event_type_occurred_at" ON "raw_events" ("event_type", "occurred_at")`);
    await queryRunner.query(`CREATE INDEX "idx_raw_events_country_occurred_at" ON "raw_events" ("country", "occurred_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_raw_events_country_occurred_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_raw_events_event_type_occurred_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_raw_events_source_occurred_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_raw_events_occurred_at"`);
    await queryRunner.query(`DROP TABLE "raw_events"`);
  }
}
