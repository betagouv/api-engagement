CREATE INDEX CONCURRENTLY IF NOT EXISTS "mission_publisher_active_idx"
ON "mission" (publisher_id, id)
WHERE deleted_at IS NULL AND status_code = 'ACCEPTED';
