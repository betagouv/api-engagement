-- CreateIndex
CREATE INDEX "stats_event_from_publisher_type_created_at_idx" ON "public"."StatEvent"("from_publisher_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_to_publisher_type_created_at_idx" ON "public"."StatEvent"("to_publisher_id", "type", "created_at");

DROP INDEX IF EXISTS "public"."stats_event_from_publisher_id_created_at_idx";
DROP INDEX IF EXISTS "public"."stats_event_to_publisher_id_created_at_idx";
