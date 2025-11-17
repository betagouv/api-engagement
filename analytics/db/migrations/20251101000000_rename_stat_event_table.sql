-- migrate:up
ALTER TABLE "analytics_raw"."StatEvent" RENAME TO "stat_event";

-- migrate:down
ALTER TABLE "analytics_raw"."stat_event" RENAME TO "StatEvent";
