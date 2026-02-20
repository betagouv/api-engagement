-- CreateEnum
CREATE TYPE "public"."ModerationEventStatus" AS ENUM ('ACCEPTED', 'REFUSED', 'PENDING', 'ONGOING');

-- CreateTable
CREATE TABLE "public"."moderation_event" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" TEXT,
    "initial_status" "public"."ModerationEventStatus",
    "new_status" "public"."ModerationEventStatus",
    "initial_comment" TEXT,
    "new_comment" TEXT,
    "initial_note" TEXT,
    "new_note" TEXT,
    "initial_title" TEXT,
    "new_title" TEXT,
    "initial_siren" TEXT,
    "new_siren" TEXT,
    "initial_rna" TEXT,
    "new_rna" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_event_updated_at_idx" ON "public"."moderation_event"("updated_at" ASC);

-- CreateIndex
CREATE INDEX "moderation_event_mission_id_idx" ON "public"."moderation_event"("mission_id");

-- CreateIndex
CREATE INDEX "moderation_event_moderator_id_idx" ON "public"."moderation_event"("moderator_id");

-- CreateIndex
CREATE INDEX "moderation_event_user_id_idx" ON "public"."moderation_event"("user_id");
