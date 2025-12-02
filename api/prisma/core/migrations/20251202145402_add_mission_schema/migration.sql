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
-- CreateEnum
CREATE TYPE "public"."MissionStatusCode" AS ENUM ('ACCEPTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "public"."MissionRemote" AS ENUM ('no', 'possible', 'full');

-- CreateEnum
CREATE TYPE "public"."MissionYesNo" AS ENUM ('yes', 'no');

-- CreateEnum
CREATE TYPE "public"."MissionPlacesStatus" AS ENUM ('ATTRIBUTED_BY_API', 'GIVEN_BY_PARTNER');

-- CreateEnum
CREATE TYPE "public"."CompensationUnit" AS ENUM ('hour', 'day', 'month', 'year');

-- CreateEnum
CREATE TYPE "public"."CompensationType" AS ENUM ('gross', 'net');

-- DropIndex
DROP INDEX "public"."stats_event_mission_client_id_created_at_idx";

-- DropIndex
DROP INDEX "public"."stats_event_mission_department_name_created_at_idx";

-- DropIndex
DROP INDEX "public"."stats_event_mission_domain_created_at_idx";

-- AlterTable
ALTER TABLE "public"."stat_event" DROP COLUMN "mission_client_id",
DROP COLUMN "mission_department_name",
DROP COLUMN "mission_domain",
DROP COLUMN "mission_organization_client_id",
DROP COLUMN "mission_organization_id",
DROP COLUMN "mission_organization_name",
DROP COLUMN "mission_postal_code",
DROP COLUMN "mission_title";

-- CreateTable
CREATE TABLE "public"."mission" (
    "id" TEXT NOT NULL,
    "_old_id" TEXT,
    "_old_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "client_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "description_html" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "soft_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rome_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reduced_mobility_accessible" "public"."MissionYesNo",
    "close_to_transport" "public"."MissionYesNo",
    "open_to_minors" "public"."MissionYesNo",
    "remote" "public"."MissionRemote",
    "schedule" TEXT,
    "duration" INTEGER,
    "posted_at" TIMESTAMP(3),
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "priority" TEXT,
    "places" INTEGER,
    "places_status" "public"."MissionPlacesStatus",
    "metadata" TEXT,
    "domain" TEXT,
    "domain_original" TEXT,
    "domain_logo" TEXT,
    "activity" TEXT,
    "type" "public"."MissionType",
    "snu" BOOLEAN DEFAULT false,
    "snu_places" INTEGER,
    "compensation_amount" DOUBLE PRECISION,
    "compensation_unit" "public"."CompensationUnit",
    "compensation_type" "public"."CompensationType",
    "last_sync_at" TIMESTAMP(3),
    "application_url" TEXT,
    "status_code" "public"."MissionStatusCode" NOT NULL,
    "status_comment" TEXT,
    "organization_client_id" TEXT,
    "organization_id" TEXT,
    "publisher_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "leboncoin_status" TEXT,
    "leboncoin_url" TEXT,
    "leboncoin_comment" TEXT,
    "leboncoin_updated_at" TIMESTAMP(3),
    "jobteaser_status" TEXT,
    "jobteaser_url" TEXT,
    "jobteaser_comment" TEXT,
    "jobteaser_updated_at" TIMESTAMP(3),
    "letudiant_public_id" JSONB,
    "letudiant_updated_at" TIMESTAMP(3),
    "letudiant_error" TEXT,
    "last_exported_to_pg_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mission_address" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "street" TEXT,
    "postal_code" TEXT,
    "department_name" TEXT,
    "department_code" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "location_lat" DOUBLE PRECISION,
    "location_lon" DOUBLE PRECISION,
    "geo_point" geography(Point,4326),
    "geoloc_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mission_moderation_status" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "publisher_id" TEXT NOT NULL,
    "status" "public"."ModerationEventStatus",
    "comment" TEXT,
    "note" TEXT,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_moderation_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_publisher_status_deleted_start_at_idx" ON "public"."mission"("publisher_id", "status_code", "deleted_at", "start_at" DESC);

-- CreateIndex
CREATE INDEX "mission_created_at_idx" ON "public"."mission"("created_at");

-- CreateIndex
CREATE INDEX "mission_start_at_idx" ON "public"."mission"("start_at");

-- CreateIndex
CREATE INDEX "mission_domain_idx" ON "public"."mission"("domain");

-- CreateIndex
CREATE INDEX "mission_remote_idx" ON "public"."mission"("remote");

-- CreateIndex
CREATE INDEX "mission_activity_idx" ON "public"."mission"("activity");

-- CreateIndex
CREATE INDEX "mission_publisher_id_idx" ON "public"."mission"("publisher_id");

-- CreateIndex
CREATE INDEX "mission_deleted_at_idx" ON "public"."mission"("deleted_at");

-- CreateIndex
CREATE INDEX "mission_status_code_idx" ON "public"."mission"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "mission_client_publisher_key" ON "public"."mission"("client_id", "publisher_id");

-- CreateIndex
CREATE INDEX "mission_address_mission_id_idx" ON "public"."mission_address"("mission_id");

-- CreateIndex
CREATE INDEX "mission_moderation_status_mission_id_idx" ON "public"."mission_moderation_status"("mission_id");

-- CreateIndex
CREATE INDEX "mission_moderation_status_publisher_id_idx" ON "public"."mission_moderation_status"("publisher_id");

-- CreateIndex
CREATE UNIQUE INDEX "mission_moderation_status_mission_publisher_key" ON "public"."mission_moderation_status"("mission_id", "publisher_id");

-- AddForeignKey
ALTER TABLE "public"."stat_event" ADD CONSTRAINT "stat_event_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."moderation_event" ADD CONSTRAINT "moderation_event_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission" ADD CONSTRAINT "mission_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission" ADD CONSTRAINT "mission_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_address" ADD CONSTRAINT "mission_address_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_moderation_status" ADD CONSTRAINT "mission_moderation_status_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_event" ADD CONSTRAINT "mission_event_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
