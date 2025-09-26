-- Create materialized views for public stats aggregates
CREATE MATERIALIZED VIEW "PublicStatsGraphMonthly" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM "created_at")::int AS year,
    EXTRACT(MONTH FROM "created_at")::int AS month,
    "mission_department_name" AS department,
    CASE WHEN "to_publisher_name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN "mission_organization_name" IS NOT NULL AND "mission_organization_name" <> '' THEN "mission_organization_name"
      ELSE NULL
    END AS organization_name,
    "type"
  FROM "public"."StatEvent"
  WHERE "is_bot" IS NOT TRUE
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
GROUP BY year, month;

CREATE UNIQUE INDEX "PublicStatsGraphMonthly_unique_idx"
  ON "PublicStatsGraphMonthly" ("year", "month", "publisher_category", "is_all_department", "department");

CREATE MATERIALIZED VIEW "PublicStatsGraphYearlyOrganizations" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM "created_at")::int AS year,
    "mission_department_name" AS department,
    CASE WHEN "to_publisher_name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN "mission_organization_name" IS NOT NULL AND "mission_organization_name" <> '' THEN "mission_organization_name"
      ELSE NULL
    END AS organization_name
  FROM "public"."StatEvent"
  WHERE "is_bot" IS NOT TRUE
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
GROUP BY year;

CREATE UNIQUE INDEX "PublicStatsGraphYearlyOrganizations_unique_idx"
  ON "PublicStatsGraphYearlyOrganizations" ("year", "publisher_category", "is_all_department", "department");

CREATE MATERIALIZED VIEW "PublicStatsDomains" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM "created_at")::int AS year,
    "mission_department_name" AS department,
    CASE WHEN "to_publisher_name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN "mission_domain" IS NOT NULL AND "mission_domain" <> '' THEN "mission_domain"
      ELSE NULL
    END AS domain,
    CASE
      WHEN "mission_id" IS NOT NULL AND "mission_id" <> '' THEN "mission_id"
      ELSE NULL
    END AS mission_id,
    "type"
  FROM "public"."StatEvent"
  WHERE "is_bot" IS NOT TRUE
    AND "mission_domain" IS NOT NULL
    AND "mission_domain" <> ''
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
GROUP BY year, domain;

CREATE UNIQUE INDEX "PublicStatsDomains_unique_idx"
  ON "PublicStatsDomains" ("year", "domain", "publisher_category", "is_all_department", "department");

CREATE MATERIALIZED VIEW "PublicStatsDepartments" AS
WITH base AS (
  SELECT
    EXTRACT(YEAR FROM "created_at")::int AS year,
    -- Derive departement from postal code: '20' for Corse (20*), '97' for any 97* or 98* (group all DOM/TOM), else first 2 digits
    CASE
      WHEN "mission_postal_code" IS NULL OR "mission_postal_code" = '' THEN NULL
      WHEN "mission_postal_code" LIKE '20%' THEN '20'
      WHEN "mission_postal_code" ~ '^(97|98)' THEN '97'
      ELSE substring("mission_postal_code" from 1 for 2)
    END AS departement,
    CASE WHEN "to_publisher_name" = 'Service Civique' THEN 'volontariat' ELSE 'benevolat' END AS publisher_category,
    CASE
      WHEN "mission_id" IS NOT NULL AND "mission_id" <> '' THEN "mission_id"
      ELSE NULL
    END AS mission_id,
    "type"
  FROM "public"."StatEvent"
  WHERE "is_bot" IS NOT TRUE
    AND "mission_postal_code" IS NOT NULL
    AND "mission_postal_code" <> ''
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
GROUP BY year, departement;

CREATE UNIQUE INDEX "PublicStatsDepartments_unique_idx"
  ON "PublicStatsDepartments" ("year", "departement", "publisher_category");
