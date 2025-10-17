CREATE INDEX IF NOT EXISTS "stats_event_from_publisher_created_at_idx" ON "StatEvent" ("from_publisher_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "stats_event_to_publisher_created_at_idx" ON "StatEvent" ("to_publisher_id", "created_at" DESC);
