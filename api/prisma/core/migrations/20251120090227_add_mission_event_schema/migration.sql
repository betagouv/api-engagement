-- CreateEnum
CREATE TYPE "public"."MissionEventType" AS ENUM ('create', 'update', 'delete');

-- CreateTable
CREATE TABLE "public"."mission_event" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "type" "public"."MissionEventType" NOT NULL,
    "changes" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_event_mission_id_idx" ON "public"."mission_event"("mission_id");

-- CreateIndex
CREATE INDEX "mission_event_updated_at_asc_idx" ON "public"."mission_event"("updated_at" ASC);
