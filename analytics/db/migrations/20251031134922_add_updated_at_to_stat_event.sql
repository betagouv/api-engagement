-- migrate:up
ALTER TABLE "analytics_raw"."StatEvent" ADD COLUMN "updated_at" TIMESTAMP(3);

-- migrate:down
ALTER TABLE "analytics_raw"."StatEvent" DROP COLUMN "updated_at";
