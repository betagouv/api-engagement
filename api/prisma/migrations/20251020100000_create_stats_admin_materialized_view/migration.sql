-- Create materialized view used by the stats-admin controller
CREATE MATERIALIZED VIEW "StatsAdminEvents" AS
SELECT
  "id",
  "created_at",
  "type",
  "from_publisher_id",
  "from_publisher_name",
  "to_publisher_id",
  "to_publisher_name",
  "source",
  CASE
    WHEN "to_publisher_name" = 'Service Civique' THEN 'volontariat'
    ELSE 'benevolat'
  END AS mission_type
FROM "public"."StatEvent"
WHERE "is_bot" IS NOT TRUE;

CREATE UNIQUE INDEX "StatsAdminEvents_id_unique_idx"
  ON "StatsAdminEvents" ("id");
CREATE INDEX "StatsAdminEvents_created_at_idx"
  ON "StatsAdminEvents" ("created_at");
CREATE INDEX "StatsAdminEvents_type_idx"
  ON "StatsAdminEvents" ("type");
CREATE INDEX "StatsAdminEvents_mission_type_idx"
  ON "StatsAdminEvents" ("mission_type");
CREATE INDEX "StatsAdminEvents_source_idx"
  ON "StatsAdminEvents" ("source");
CREATE INDEX "StatsAdminEvents_from_publisher_id_idx"
  ON "StatsAdminEvents" ("from_publisher_id");
CREATE INDEX "StatsAdminEvents_to_publisher_id_idx"
  ON "StatsAdminEvents" ("to_publisher_id");
CREATE INDEX "StatsAdminEvents_from_publisher_name_idx"
  ON "StatsAdminEvents" ("from_publisher_name");
CREATE INDEX "StatsAdminEvents_to_publisher_name_idx"
  ON "StatsAdminEvents" ("to_publisher_name");
