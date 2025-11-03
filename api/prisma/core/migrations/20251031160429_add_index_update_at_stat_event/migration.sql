-- CreateIndex
CREATE INDEX CONCURRENTLY "stats_event_updated_at_asc_idx" ON "public"."StatEvent"("updated_at" ASC);
