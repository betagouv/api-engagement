/*
  Warnings:

  - You are about to drop the column `from_publisher_name` on the `StatEvent` table. All the data in the column will be lost.
  - You are about to drop the column `to_publisher_name` on the `StatEvent` table. All the data in the column will be lost.

*/
-- Drop dependent materialized views before altering StatEvent
DROP MATERIALIZED VIEW IF EXISTS "public"."StatsGlobalMissionActivity";
DROP MATERIALIZED VIEW IF EXISTS "public"."StatsGlobalEvents";
DROP MATERIALIZED VIEW IF EXISTS "public"."PublicStatsDepartments";
DROP MATERIALIZED VIEW IF EXISTS "public"."PublicStatsDomains";
DROP MATERIALIZED VIEW IF EXISTS "public"."PublicStatsGraphYearlyOrganizations";
DROP MATERIALIZED VIEW IF EXISTS "public"."PublicStatsGraphMonthly";


-- AlterTable
ALTER TABLE "public"."StatEvent"
  DROP COLUMN "from_publisher_name",
  DROP COLUMN "to_publisher_name",
  ALTER COLUMN "tags" SET DEFAULT ARRAY[]::text[];

-- AddForeignKey (only if it does not already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StatEvent_from_publisher_id_fkey'
  ) THEN
    ALTER TABLE "public"."StatEvent" ADD CONSTRAINT "StatEvent_from_publisher_id_fkey" FOREIGN KEY ("from_publisher_id") REFERENCES "public"."publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (only if it does not already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StatEvent_to_publisher_id_fkey'
  ) THEN
    ALTER TABLE "public"."StatEvent" ADD CONSTRAINT "StatEvent_to_publisher_id_fkey" FOREIGN KEY ("to_publisher_id") REFERENCES "public"."publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Rename StatEvent table to snake_case
ALTER TABLE "public"."StatEvent" RENAME TO "stat_event";

-- Recreate materialized views using publisher relations
CREATE MATERIALIZED VIEW "public"."StatsGlobalEvents" AS
SELECT
  se."id",
  se."created_at",
  se."type",
  se."source",
  se."from_publisher_id",
  fp."name" AS "from_publisher_name",
  se."to_publisher_id",
  tp."name" AS "to_publisher_name",
  se."mission_id"
FROM "public"."stat_event" se
LEFT JOIN "public"."publisher" fp ON fp."id" = se."from_publisher_id"
LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
WHERE se."is_bot" IS NOT TRUE
WITH NO DATA;

CREATE UNIQUE INDEX "StatsGlobalEvents_id_unique_idx"
  ON "public"."StatsGlobalEvents" ("id");
CREATE INDEX "StatsGlobalEvents_created_at_idx"
  ON "public"."StatsGlobalEvents" ("created_at");
CREATE INDEX "StatsGlobalEvents_type_idx"
  ON "public"."StatsGlobalEvents" ("type");
CREATE INDEX "StatsGlobalEvents_source_idx"
  ON "public"."StatsGlobalEvents" ("source");
CREATE INDEX "StatsGlobalEvents_from_publisher_idx"
  ON "public"."StatsGlobalEvents" ("from_publisher_id");
CREATE INDEX "StatsGlobalEvents_to_publisher_idx"
  ON "public"."StatsGlobalEvents" ("to_publisher_id");
CREATE INDEX "StatsGlobalEvents_mission_idx"
  ON "public"."StatsGlobalEvents" ("mission_id");

CREATE MATERIALIZED VIEW "public"."StatsGlobalMissionActivity" AS
SELECT
  se."mission_id",
  se."type",
  se."from_publisher_id",
  fp."name" AS "from_publisher_name",
  se."to_publisher_id",
  tp."name" AS "to_publisher_name",
  MIN(se."created_at") AS "first_created_at",
  MAX(se."created_at") AS "last_created_at"
FROM "public"."stat_event" se
LEFT JOIN "public"."publisher" fp ON fp."id" = se."from_publisher_id"
LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
WHERE se."is_bot" IS NOT TRUE
  AND se."mission_id" IS NOT NULL
  AND TRIM(se."mission_id") <> ''
  AND TRIM(se."from_publisher_id") <> ''
  AND TRIM(se."to_publisher_id") <> ''
GROUP BY
  se."mission_id",
  se."type",
  se."from_publisher_id",
  fp."name",
  se."to_publisher_id",
  tp."name"
WITH NO DATA;

CREATE UNIQUE INDEX "StatsGlobalMissionActivity_unique_idx"
  ON "public"."StatsGlobalMissionActivity" (
    "mission_id",
    "type",
    "from_publisher_id",
    "to_publisher_id"
  );
CREATE INDEX "StatsGlobalMissionActivity_first_created_idx"
  ON "public"."StatsGlobalMissionActivity" ("first_created_at");
CREATE INDEX "StatsGlobalMissionActivity_last_created_idx"
  ON "public"."StatsGlobalMissionActivity" ("last_created_at");
CREATE INDEX "StatsGlobalMissionActivity_from_publisher_idx"
  ON "public"."StatsGlobalMissionActivity" ("from_publisher_id");
CREATE INDEX "StatsGlobalMissionActivity_to_publisher_idx"
  ON "public"."StatsGlobalMissionActivity" ("to_publisher_id");
CREATE INDEX "StatsGlobalMissionActivity_type_idx"
  ON "public"."StatsGlobalMissionActivity" ("type");

-- Recreate public stats materialized views using publisher relations
CREATE MATERIALIZED VIEW "public"."PublicStatsGraphMonthly" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM se."created_at")::int AS year,
    EXTRACT(MONTH FROM se."created_at")::int AS month,
    se."mission_department_name" AS department,
    CASE WHEN tp."name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN se."mission_organization_name" IS NOT NULL AND se."mission_organization_name" <> '' THEN se."mission_organization_name"
      ELSE NULL
    END AS organization_name,
    se."type"
  FROM "public"."stat_event" se
  LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
  WHERE se."is_bot" IS NOT TRUE
)
SELECT
  year,
  month,
  department,
  FALSE AS is_all_department,
  publisher_category,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count,
  COUNT(DISTINCT organization_name)::bigint AS organization_count
FROM base
GROUP BY year, month, department, publisher_category

UNION ALL
SELECT
  year,
  month,
  department,
  FALSE AS is_all_department,
  'all' AS publisher_category,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count,
  COUNT(DISTINCT organization_name)::bigint AS organization_count
FROM base
GROUP BY year, month, department

UNION ALL
SELECT
  year,
  month,
  NULL AS department,
  TRUE AS is_all_department,
  publisher_category,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count,
  COUNT(DISTINCT organization_name)::bigint AS organization_count
FROM base
GROUP BY year, month, publisher_category

UNION ALL
SELECT
  year,
  month,
  NULL AS department,
  TRUE AS is_all_department,
  'all' AS publisher_category,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count,
  COUNT(DISTINCT organization_name)::bigint AS organization_count
FROM base
GROUP BY year, month
WITH NO DATA;

CREATE UNIQUE INDEX "PublicStatsGraphMonthly_unique_idx"
  ON "public"."PublicStatsGraphMonthly" ("year", "month", "publisher_category", "is_all_department", "department");

CREATE MATERIALIZED VIEW "public"."PublicStatsGraphYearlyOrganizations" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM se."created_at")::int AS year,
    se."mission_department_name" AS department,
    CASE WHEN tp."name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN se."mission_organization_name" IS NOT NULL AND se."mission_organization_name" <> '' THEN se."mission_organization_name"
      ELSE NULL
    END AS organization_name
  FROM "public"."stat_event" se
  LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
  WHERE se."is_bot" IS NOT TRUE
)
SELECT
  year,
  department,
  FALSE AS is_all_department,
  publisher_category,
  COUNT(DISTINCT organization_name)::bigint AS organization_count
FROM base
GROUP BY year, department, publisher_category

UNION ALL
SELECT
  year,
  department,
  FALSE AS is_all_department,
  'all' AS publisher_category,
  COUNT(DISTINCT organization_name)::bigint AS organization_count
FROM base
GROUP BY year, department

UNION ALL
SELECT
  year,
  NULL AS department,
  TRUE AS is_all_department,
  publisher_category,
  COUNT(DISTINCT organization_name)::bigint AS organization_count
FROM base
GROUP BY year, publisher_category

UNION ALL
SELECT
  year,
  NULL AS department,
  TRUE AS is_all_department,
  'all' AS publisher_category,
  COUNT(DISTINCT organization_name)::bigint AS organization_count
FROM base
GROUP BY year
WITH NO DATA;

CREATE UNIQUE INDEX "PublicStatsGraphYearlyOrganizations_unique_idx"
  ON "public"."PublicStatsGraphYearlyOrganizations" ("year", "publisher_category", "is_all_department", "department");

CREATE MATERIALIZED VIEW "public"."PublicStatsDomains" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM se."created_at")::int AS year,
    se."mission_department_name" AS department,
    CASE WHEN tp."name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN se."mission_domain" IS NOT NULL AND se."mission_domain" <> '' THEN se."mission_domain"
      ELSE NULL
    END AS domain,
    CASE
      WHEN se."mission_id" IS NOT NULL AND se."mission_id" <> '' THEN se."mission_id"
      ELSE NULL
    END AS mission_id,
    se."type"
  FROM "public"."stat_event" se
  LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
  WHERE se."is_bot" IS NOT TRUE
    AND se."mission_domain" IS NOT NULL
    AND se."mission_domain" <> ''
)
SELECT
  year,
  department,
  FALSE AS is_all_department,
  publisher_category,
  domain,
  COUNT(DISTINCT mission_id)::bigint AS mission_count,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count
FROM base
GROUP BY year, department, publisher_category, domain

UNION ALL
SELECT
  year,
  department,
  FALSE AS is_all_department,
  'all' AS publisher_category,
  domain,
  COUNT(DISTINCT mission_id)::bigint AS mission_count,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count
FROM base
GROUP BY year, department, domain

UNION ALL
SELECT
  year,
  NULL AS department,
  TRUE AS is_all_department,
  publisher_category,
  domain,
  COUNT(DISTINCT mission_id)::bigint AS mission_count,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count
FROM base
GROUP BY year, publisher_category, domain

UNION ALL
SELECT
  year,
  NULL AS department,
  TRUE AS is_all_department,
  'all' AS publisher_category,
  domain,
  COUNT(DISTINCT mission_id)::bigint AS mission_count,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count
FROM base
GROUP BY year, domain
WITH NO DATA;

CREATE UNIQUE INDEX "PublicStatsDomains_unique_idx"
  ON "public"."PublicStatsDomains" ("year", "domain", "publisher_category", "is_all_department", "department");

CREATE MATERIALIZED VIEW "public"."PublicStatsDepartments" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM se."created_at")::int AS year,
    CASE
      WHEN se."mission_postal_code" IS NULL OR se."mission_postal_code" = '' THEN NULL
      WHEN se."mission_postal_code" LIKE '20%' THEN '20'
      WHEN se."mission_postal_code" ~ '^(97|98)' THEN '97'
      ELSE substring(se."mission_postal_code" from 1 for 2)
    END AS departement,
    CASE WHEN tp."name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN se."mission_id" IS NOT NULL AND se."mission_id" <> '' THEN se."mission_id"
      ELSE NULL
    END AS mission_id,
    se."type"
  FROM "public"."stat_event" se
  LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
  WHERE se."is_bot" IS NOT TRUE
    AND se."mission_postal_code" IS NOT NULL
    AND se."mission_postal_code" <> ''
)
SELECT
  year,
  departement,
  publisher_category,
  COUNT(DISTINCT mission_id)::bigint AS mission_count,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count
FROM base
GROUP BY year, departement, publisher_category

UNION ALL
SELECT
  year,
  departement,
  'all' AS publisher_category,
  COUNT(DISTINCT mission_id)::bigint AS mission_count,
  SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
  SUM(CASE WHEN type = 'apply' THEN 1 ELSE 0 END)::bigint AS apply_count
FROM base
GROUP BY year, departement
WITH NO DATA;

CREATE UNIQUE INDEX "PublicStatsDepartments_unique_idx"
  ON "public"."PublicStatsDepartments" ("year", "departement", "publisher_category");
