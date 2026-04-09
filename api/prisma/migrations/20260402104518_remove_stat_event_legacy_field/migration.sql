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
