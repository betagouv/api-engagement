-- Create materialized views used by the stats-global endpoint
CREATE MATERIALIZED VIEW "StatsGlobalEvents" AS
SELECT
  "id",
  "created_at",
  "type",
  "source",
  "from_publisher_id",
  "from_publisher_name",
  "to_publisher_id",
  "to_publisher_name",
  "mission_id"
FROM "public"."StatEvent"
WHERE "is_bot" IS NOT TRUE;

CREATE UNIQUE INDEX "StatsGlobalEvents_id_unique_idx"
  ON "StatsGlobalEvents" ("id");
CREATE INDEX "StatsGlobalEvents_created_at_idx"
  ON "StatsGlobalEvents" ("created_at");
CREATE INDEX "StatsGlobalEvents_type_idx"
  ON "StatsGlobalEvents" ("type");
CREATE INDEX "StatsGlobalEvents_source_idx"
  ON "StatsGlobalEvents" ("source");
CREATE INDEX "StatsGlobalEvents_from_publisher_idx"
  ON "StatsGlobalEvents" ("from_publisher_id");
CREATE INDEX "StatsGlobalEvents_to_publisher_idx"
  ON "StatsGlobalEvents" ("to_publisher_id");
CREATE INDEX "StatsGlobalEvents_mission_idx"
  ON "StatsGlobalEvents" ("mission_id");

CREATE MATERIALIZED VIEW "StatsGlobalMissionActivity" AS
SELECT
  "mission_id",
  "type",
  "from_publisher_id",
  "from_publisher_name",
  "to_publisher_id",
  "to_publisher_name",
  MIN("created_at") AS "first_created_at",
  MAX("created_at") AS "last_created_at"
FROM "public"."StatEvent"
WHERE "is_bot" IS NOT TRUE
  AND "mission_id" IS NOT NULL
GROUP BY
  "mission_id",
  "type",
  "from_publisher_id",
  "from_publisher_name",
  "to_publisher_id",
  "to_publisher_name";

CREATE UNIQUE INDEX "StatsGlobalMissionActivity_unique_idx"
  ON "StatsGlobalMissionActivity" (
    "mission_id",
    "type",
    "from_publisher_id",
    "to_publisher_id"
  );
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
