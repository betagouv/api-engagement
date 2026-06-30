CREATE INDEX CONCURRENTLY IF NOT EXISTS "mission_active_publisher_start_at_idx"
ON "public"."mission" ("publisher_id", "start_at" DESC, "id")
WHERE "deleted_at" IS NULL AND "status_code" = 'ACCEPTED'::"public"."MissionStatusCode";
