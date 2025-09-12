-- CreateEnum
CREATE TYPE "public"."StatEventType" AS ENUM ('click', 'print', 'apply', 'account');

-- CreateEnum
CREATE TYPE "public"."StatSource" AS ENUM ('api', 'widget', 'campaign', 'seo', 'jstag', 'publisher');

-- CreateEnum
CREATE TYPE "public"."StatEventStatus" AS ENUM ('PENDING', 'VALIDATED', 'CANCEL', 'CANCELED', 'REFUSED', 'CARRIED_OUT');

-- CreateTable
CREATE TABLE "public"."StatEvent" (
    "id" TEXT NOT NULL,
    "type" "public"."StatEventType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "click_user" TEXT,
    "click_id" TEXT,
    "request_id" TEXT,
    "origin" TEXT NOT NULL,
    "referer" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "user" TEXT,
    "is_bot" BOOLEAN NOT NULL,
    "is_human" BOOLEAN NOT NULL,
    "source" "public"."StatSource" NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "status" "public"."StatEventStatus" NOT NULL,
    "from_publisher_id" TEXT NOT NULL,
    "from_publisher_name" TEXT NOT NULL,
    "to_publisher_id" TEXT NOT NULL,
    "to_publisher_name" TEXT NOT NULL,
    "mission_id" TEXT,
    "mission_client_id" TEXT,
    "mission_domain" TEXT,
    "mission_title" TEXT,
    "mission_postal_code" TEXT,
    "mission_department_name" TEXT,
    "mission_organization_id" TEXT,
    "mission_organization_name" TEXT,
    "mission_organization_client_id" TEXT,
    "tag" TEXT,
    "tags" TEXT[],

    CONSTRAINT "StatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stats_event_type_created_at_desc_idx" ON "public"."StatEvent"("type", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_mission_id_created_at_idx" ON "public"."StatEvent"("mission_id", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_mission_client_id_created_at_idx" ON "public"."StatEvent"("mission_client_id", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_to_publisher_id_created_at_idx" ON "public"."StatEvent"("to_publisher_id", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_from_publisher_id_created_at_idx" ON "public"."StatEvent"("from_publisher_id", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_mission_department_name_created_at_idx" ON "public"."StatEvent"("mission_department_name", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_mission_domain_created_at_idx" ON "public"."StatEvent"("mission_domain", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_tags_idx" ON "public"."StatEvent" USING GIN ("tags");
