import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchaseAmountColumn20260315010000 implements MigrationInterface {
  public readonly name = "AddPurchaseAmountColumn20260315010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "raw_events"
      ADD COLUMN "purchase_amount" NUMERIC
    `);

    await queryRunner.query(`
      UPDATE "raw_events"
      SET "purchase_amount" = CASE
        WHEN payload #>> '{data,engagement,purchaseAmount}' ~ '^[0-9]+(\\.[0-9]+)?$'
          THEN (payload #>> '{data,engagement,purchaseAmount}')::numeric
        ELSE NULL
      END
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_raw_events_revenue_source_occurred_at"
      ON "raw_events" ("source", "occurred_at")
      WHERE "purchase_amount" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_raw_events_revenue_source_occurred_at"`);
    await queryRunner.query(`
      ALTER TABLE "raw_events"
      DROP COLUMN "purchase_amount"
    `);
  }
}
