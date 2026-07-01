-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."tracking_event" (
  "uuid" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "distinct_id" TEXT,
  "person_id" TEXT,
  "session_id" TEXT,
  "current_url" TEXT,
  "pathname" TEXT,
  "properties" JSONB,
  "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tracking_event_pkey" PRIMARY KEY ("uuid")
);

CREATE INDEX IF NOT EXISTS "tracking_event_timestamp_idx" ON "analytics_raw"."tracking_event" ("timestamp");

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."tracking_event";
