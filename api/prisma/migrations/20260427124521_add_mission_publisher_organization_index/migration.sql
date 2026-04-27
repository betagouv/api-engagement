-- CreateIndex
CREATE INDEX CONCURRENTLY mission_publisher_id_start_at_status_code_deleted_at_publisher_organization_id_idx
ON "public"."mission" ("publisher_id", "start_at" DESC)
WHERE
  "status_code" = 'ACCEPTED'::"public"."MissionStatusCode"
  AND "deleted_at" IS NULL
  AND "publisher_organization_id" IS NOT NULL;

