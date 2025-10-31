-- migrate:up
ALTER TABLE "analytics_raw"."StatEvent" ADD COLUMN     "updated_at" TIMESTAMP(3);
UPDATE "analytics_raw"."StatEvent" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "analytics_raw"."StatEvent" ALTER COLUMN "updated_at" SET NOT NULL;

-- migrate:down
ALTER TABLE "analytics_raw"."StatEvent" DROP COLUMN "updated_at";
