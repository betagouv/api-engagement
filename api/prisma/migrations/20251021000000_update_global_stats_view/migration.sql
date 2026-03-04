-- 1) Drop indexes et vue
DROP INDEX IF EXISTS "StatsGlobalMissionActivity_unique_idx";
DROP INDEX IF EXISTS "StatsGlobalMissionActivity_first_created_idx";
DROP INDEX IF EXISTS "StatsGlobalMissionActivity_last_created_idx";
DROP INDEX IF EXISTS "StatsGlobalMissionActivity_from_publisher_idx";
DROP INDEX IF EXISTS "StatsGlobalMissionActivity_to_publisher_idx";
DROP INDEX IF EXISTS "StatsGlobalMissionActivity_type_idx";
DROP MATERIALIZED VIEW IF EXISTS "StatsGlobalMissionActivity";

-- 2) Recréer la vue en groupant UNIQUEMENT par IDs + filtrage des strings vides
CREATE MATERIALIZED VIEW "StatsGlobalMissionActivity" AS
SELECT
  "mission_id",
  "type",
  "from_publisher_id",
  MIN("from_publisher_name") AS "from_publisher_name",
  "to_publisher_id",
  MIN("to_publisher_name") AS "to_publisher_name",
  MIN("created_at") AS "first_created_at",
  MAX("created_at") AS "last_created_at"
FROM "public"."StatEvent"
WHERE "is_bot" IS NOT TRUE
  AND "mission_id" IS NOT NULL
  AND TRIM("mission_id") <> ''
  AND TRIM("from_publisher_id") <> ''
  AND TRIM("to_publisher_id") <> ''
GROUP BY
  "mission_id",
  "type",
  "from_publisher_id",
  "to_publisher_id";

-- 3) Recréer les indexes
CREATE UNIQUE INDEX "StatsGlobalMissionActivity_unique_idx"
  ON "StatsGlobalMissionActivity" ("mission_id", "type", "from_publisher_id", "to_publisher_id");
CREATE INDEX "StatsGlobalMissionActivity_first_created_idx"
  ON "StatsGlobalMissionActivity" ("first_created_at");
CREATE INDEX "StatsGlobalMissionActivity_last_created_idx"
  ON "StatsGlobalMissionActivity" ("last_created_at");
CREATE INDEX "StatsGlobalMissionActivity_from_publisher_idx"
  ON "StatsGlobalMissionActivity" ("from_publisher_id");
CREATE INDEX "StatsGlobalMissionActivity_to_publisher_idx"
  ON "StatsGlobalMissionActivity" ("to_publisher_id");
CREATE INDEX "StatsGlobalMissionActivity_type_idx"
  ON "StatsGlobalMissionActivity" ("type");