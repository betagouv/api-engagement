-- migrate:up
ALTER TABLE "analytics_raw"."stat_event" ADD COLUMN "client_event_id" TEXT;

-- migrate:down
ALTER TABLE "analytics_raw"."stat_event" DROP COLUMN "client_event_id";
