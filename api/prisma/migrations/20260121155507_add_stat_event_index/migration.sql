-- CreateIndex
CREATE INDEX CONCURRENTLY "stats_event_mission_is_bot_type_from_publisher_idx"
ON "stat_event"("mission_id", "is_bot", "type", "from_publisher_id");
