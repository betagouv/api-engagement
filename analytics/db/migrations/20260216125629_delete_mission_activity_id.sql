-- migrate:up
ALTER TABLE "analytics_raw"."mission" DROP COLUMN "activity_id";

-- migrate:down
ALTER TABLE "analytics_raw"."mission" ADD COLUMN "activity_id" TEXT;
