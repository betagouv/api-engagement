/*
  Warnings:

  - You are about to drop the column `mission_client_id` on the `stat_event` table. All the data in the column will be lost.
  - You are about to drop the column `mission_department_name` on the `stat_event` table. All the data in the column will be lost.
  - You are about to drop the column `mission_domain` on the `stat_event` table. All the data in the column will be lost.
  - You are about to drop the column `mission_organization_client_id` on the `stat_event` table. All the data in the column will be lost.
  - You are about to drop the column `mission_organization_id` on the `stat_event` table. All the data in the column will be lost.
  - You are about to drop the column `mission_organization_name` on the `stat_event` table. All the data in the column will be lost.
  - You are about to drop the column `mission_postal_code` on the `stat_event` table. All the data in the column will be lost.
  - You are about to drop the column `mission_title` on the `stat_event` table. All the data in the column will be lost.

*/

-- Drop all materialized views that depend on stat_event
DROP MATERIALIZED VIEW IF EXISTS "public"."PublicStatsGraphYearlyOrganizations";
DROP MATERIALIZED VIEW IF EXISTS "public"."PublicStatsGraphMonthly";
DROP MATERIALIZED VIEW IF EXISTS "public"."PublicStatsDomains";
DROP MATERIALIZED VIEW IF EXISTS "public"."PublicStatsDepartments";
DROP MATERIALIZED VIEW IF EXISTS "public"."StatsGlobalMissionActivity";
DROP MATERIALIZED VIEW IF EXISTS "public"."StatsGlobalEvents";

-- DropIndex
DROP INDEX IF EXISTS "stats_event_mission_client_id_created_at_idx";
DROP INDEX IF EXISTS "stats_event_mission_department_name_created_at_idx";
DROP INDEX IF EXISTS "stats_event_mission_domain_created_at_idx";

-- AlterTable
ALTER TABLE "stat_event" DROP COLUMN "mission_client_id",
DROP COLUMN "mission_department_name",
DROP COLUMN "mission_domain",
DROP COLUMN "mission_organization_client_id",
DROP COLUMN "mission_organization_id",
DROP COLUMN "mission_organization_name",
DROP COLUMN "mission_postal_code",
DROP COLUMN "mission_title";

-- AddForeignKey
ALTER TABLE "stat_event" ADD CONSTRAINT "stat_event_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recreate StatsGlobalEvents (unchanged, no dependency on dropped columns)
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

-- Recreate StatsGlobalMissionActivity (unchanged, no dependency on dropped columns)
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

-- Recreate PublicStatsGraphMonthly with JOINs (replaces denormalized fields)
CREATE MATERIALIZED VIEW "public"."PublicStatsGraphMonthly" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM se."created_at")::int AS year,
    EXTRACT(MONTH FROM se."created_at")::int AS month,
    ma."department_name" AS department,
    CASE WHEN tp."name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN po."name" IS NOT NULL AND po."name" <> '' THEN po."name"
      ELSE NULL
    END AS organization_name,
    se."type"
  FROM "public"."stat_event" se
  LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
  LEFT JOIN "public"."mission" m ON m."id" = se."mission_id"
  LEFT JOIN "public"."publisher_organization" po ON po."id" = m."publisher_organization_id"
  LEFT JOIN LATERAL (
    SELECT "department_name" FROM "public"."mission_address"
    WHERE "mission_id" = m."id"
    ORDER BY "created_at" ASC
    LIMIT 1
  ) ma ON TRUE
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

-- Recreate PublicStatsGraphYearlyOrganizations with JOINs
CREATE MATERIALIZED VIEW "public"."PublicStatsGraphYearlyOrganizations" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM se."created_at")::int AS year,
    ma."department_name" AS department,
    CASE WHEN tp."name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN po."name" IS NOT NULL AND po."name" <> '' THEN po."name"
      ELSE NULL
    END AS organization_name
  FROM "public"."stat_event" se
  LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
  LEFT JOIN "public"."mission" m ON m."id" = se."mission_id"
  LEFT JOIN "public"."publisher_organization" po ON po."id" = m."publisher_organization_id"
  LEFT JOIN LATERAL (
    SELECT "department_name" FROM "public"."mission_address"
    WHERE "mission_id" = m."id"
    ORDER BY "created_at" ASC
    LIMIT 1
  ) ma ON TRUE
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

-- Recreate PublicStatsDomains with JOINs
CREATE MATERIALIZED VIEW "public"."PublicStatsDomains" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM se."created_at")::int AS year,
    ma."department_name" AS department,
    CASE WHEN tp."name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN d."name" IS NOT NULL AND d."name" <> '' THEN d."name"
      ELSE NULL
    END AS domain,
    se."mission_id",
    se."type"
  FROM "public"."stat_event" se
  LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
  LEFT JOIN "public"."mission" m ON m."id" = se."mission_id"
  LEFT JOIN "public"."domain" d ON d."id" = m."domain_id"
  LEFT JOIN LATERAL (
    SELECT "department_name" FROM "public"."mission_address"
    WHERE "mission_id" = m."id"
    ORDER BY "created_at" ASC
    LIMIT 1
  ) ma ON TRUE
  WHERE se."is_bot" IS NOT TRUE
    AND d."name" IS NOT NULL
    AND d."name" <> ''
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

-- Recreate PublicStatsDepartments with JOINs
CREATE MATERIALIZED VIEW "public"."PublicStatsDepartments" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM se."created_at")::int AS year,
    CASE
      WHEN ma."postal_code" IS NULL OR ma."postal_code" = '' THEN NULL
      WHEN ma."postal_code" LIKE '20%' THEN '20'
      WHEN ma."postal_code" ~ '^(97|98)' THEN '97'
      ELSE substring(ma."postal_code" from 1 for 2)
    END AS departement,
    CASE WHEN tp."name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    se."mission_id",
    se."type"
  FROM "public"."stat_event" se
  LEFT JOIN "public"."publisher" tp ON tp."id" = se."to_publisher_id"
  LEFT JOIN "public"."mission" m ON m."id" = se."mission_id"
  LEFT JOIN LATERAL (
    SELECT "postal_code" FROM "public"."mission_address"
    WHERE "mission_id" = m."id"
    ORDER BY "created_at" ASC
    LIMIT 1
  ) ma ON TRUE
  WHERE se."is_bot" IS NOT TRUE
    AND ma."postal_code" IS NOT NULL
    AND ma."postal_code" <> ''
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
