-- migrate:up
ALTER TABLE "analytics_raw"."StatEvent" RENAME TO "stat_event";
DO $$
BEGIN
  UPDATE analytics_raw.pg_export_state
  SET "key" = 'stat_event'
  WHERE "key" = 'StatEvent';
EXCEPTION WHEN undefined_table THEN
  NULL;
END
$$;

-- migrate:down
ALTER TABLE "analytics_raw"."stat_event" RENAME TO "StatEvent";
DO $$
BEGIN
  UPDATE analytics_raw.pg_export_state
  SET "key" = 'StatEvent'
  WHERE "key" = 'stat_event';
EXCEPTION WHEN undefined_table THEN
  NULL;
END
$$;