-- CreateEnum
CREATE TYPE "public"."MissionStatusCode" AS ENUM ('ACCEPTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "public"."MissionRemote" AS ENUM ('no', 'possible', 'full');

-- CreateEnum
CREATE TYPE "public"."MissionPlacesStatus" AS ENUM ('ATTRIBUTED_BY_API', 'GIVEN_BY_PARTNER');

-- CreateEnum
CREATE TYPE "public"."MissionCompensationUnit" AS ENUM ('hour', 'day', 'month', 'year');

-- CreateEnum
CREATE TYPE "public"."MissionCompensationType" AS ENUM ('gross', 'net');

-- CreateEnum
CREATE TYPE "public"."JobBoardId" AS ENUM ('LETUDIANT', 'JOBTEASER', 'LEBONCOIN');

-- CreateTable
CREATE TABLE "public"."mission" (
    "id" TEXT NOT NULL,
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
    "reduced_mobility_accessible" BOOLEAN,
    "close_to_transport" BOOLEAN,
    "open_to_minors" BOOLEAN,
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
    "domain_original" TEXT,
    "domain_logo" TEXT,
    "type" "public"."MissionType",
    "snu" BOOLEAN DEFAULT false,
    "snu_places" INTEGER,
    "compensation_amount" DOUBLE PRECISION,
    "compensation_unit" "public"."MissionCompensationUnit",
    "compensation_type" "public"."MissionCompensationType",
    "last_sync_at" TIMESTAMP(3),
    "application_url" TEXT,
    "status_code" "public"."MissionStatusCode" NOT NULL,
    "status_comment" TEXT,
    "organization_client_id" TEXT,
    "organization_id" TEXT,
    "publisher_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
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
    "geo_point" point,
    "geoloc_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mission_domain" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "original" TEXT,
    "logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mission_activity" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mission_jobboard" (
    "id" TEXT NOT NULL,
    "jobboard_id" "public"."JobBoardId" NOT NULL,
    "mission_id" TEXT NOT NULL,
    "mission_address_id" TEXT,
    "public_id" TEXT NOT NULL,
    "status" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_jobboard_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "mission_status_deleted_start_at_idx" ON "public"."mission"("status_code", "deleted_at", "start_at" DESC);

-- CreateIndex
CREATE INDEX "mission_created_at_idx" ON "public"."mission"("created_at");

-- CreateIndex
CREATE INDEX "mission_start_at_idx" ON "public"."mission"("start_at");

-- CreateIndex
CREATE INDEX "mission_remote_idx" ON "public"."mission"("remote");

-- CreateIndex
CREATE INDEX "mission_publisher_id_idx" ON "public"."mission"("publisher_id");

-- CreateIndex
CREATE INDEX "mission_client_id_idx" ON "public"."mission"("client_id");

-- CreateIndex
CREATE INDEX "mission_organization_client_id_idx" ON "public"."mission"("organization_client_id");

-- CreateIndex
CREATE INDEX "mission_deleted_at_idx" ON "public"."mission"("deleted_at");

-- CreateIndex
CREATE INDEX "mission_status_code_idx" ON "public"."mission"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "mission_client_publisher_key" ON "public"."mission"("client_id", "publisher_id");

-- CreateIndex
CREATE INDEX "mission_address_mission_id_idx" ON "public"."mission_address"("mission_id");

-- CreateIndex
CREATE INDEX "mission_address_city_idx" ON "public"."mission_address"("city");

-- CreateIndex
CREATE INDEX "mission_address_country_idx" ON "public"."mission_address"("country");

-- CreateIndex
CREATE INDEX "mission_address_department_name_idx" ON "public"."mission_address"("department_name");

-- CreateIndex
CREATE INDEX "mission_domain_mission_id_idx" ON "public"."mission_domain"("mission_id");

-- CreateIndex
CREATE INDEX "mission_domain_value_idx" ON "public"."mission_domain"("value");

-- CreateIndex
CREATE UNIQUE INDEX "mission_domain_mission_value_key" ON "public"."mission_domain"("mission_id", "value");

-- CreateIndex
CREATE INDEX "mission_activity_mission_id_idx" ON "public"."mission_activity"("mission_id");

-- CreateIndex
CREATE INDEX "mission_activity_value_idx" ON "public"."mission_activity"("value");

-- CreateIndex
CREATE UNIQUE INDEX "mission_activity_mission_value_key" ON "public"."mission_activity"("mission_id", "value");

-- CreateIndex
CREATE INDEX "mission_jobboard_mission_id_idx" ON "public"."mission_jobboard"("mission_id");

-- CreateIndex
CREATE INDEX "mission_jobboard_address_id_idx" ON "public"."mission_jobboard"("mission_address_id");

-- CreateIndex
CREATE UNIQUE INDEX "mission_jobboard_unique" ON "public"."mission_jobboard"("jobboard_id", "mission_id", "mission_address_id");

-- CreateIndex
CREATE INDEX "mission_moderation_status_mission_id_idx" ON "public"."mission_moderation_status"("mission_id");

-- CreateIndex
CREATE INDEX "mission_moderation_status_publisher_id_idx" ON "public"."mission_moderation_status"("publisher_id");

-- CreateIndex
CREATE INDEX "mission_moderation_status_publisher_status_idx" ON "public"."mission_moderation_status"("publisher_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mission_moderation_status_mission_publisher_key" ON "public"."mission_moderation_status"("mission_id", "publisher_id");

-- AddForeignKey
ALTER TABLE "public"."moderation_event" ADD CONSTRAINT "moderation_event_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission" ADD CONSTRAINT "mission_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission" ADD CONSTRAINT "mission_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_address" ADD CONSTRAINT "mission_address_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_domain" ADD CONSTRAINT "mission_domain_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_activity" ADD CONSTRAINT "mission_activity_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_jobboard" ADD CONSTRAINT "mission_jobboard_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_jobboard" ADD CONSTRAINT "mission_jobboard_mission_address_id_fkey" FOREIGN KEY ("mission_address_id") REFERENCES "public"."mission_address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_moderation_status" ADD CONSTRAINT "mission_moderation_status_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission_event" ADD CONSTRAINT "mission_event_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
