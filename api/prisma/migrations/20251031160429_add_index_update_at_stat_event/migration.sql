-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "stats_event_updated_at_asc_idx" ON "public"."StatEvent"("updated_at" ASC);
