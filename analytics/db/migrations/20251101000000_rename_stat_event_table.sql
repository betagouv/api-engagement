-- migrate:up
ALTER TABLE "analytics_raw"."StatEvent" RENAME TO "stat_event";
UPDATE "analytics_raw"."pg_export_state" SET "key" = 'stat_event' WHERE "key" = 'StatEvent';

-- migrate:down
ALTER TABLE "analytics_raw"."stat_event" RENAME TO "StatEvent";
UPDATE "analytics_raw"."pg_export_state" SET "key" = 'StatEvent' WHERE "key" = 'stat_event';