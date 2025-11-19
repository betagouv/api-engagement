-- AlterTable
ALTER TABLE "public"."stat_event" RENAME CONSTRAINT "StatEvent_pkey" TO "stat_event_pkey";

-- CreateTable
CREATE TABLE "public"."stats_bot" (
    "id" TEXT NOT NULL,
    "origin" TEXT,
    "referer" TEXT,
    "user_agent" TEXT,
    "host" TEXT,
    "user" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stats_bot_user_key" ON "public"."stats_bot"("user");

-- CreateIndex
CREATE INDEX "stats_bot_user_idx" ON "public"."stats_bot"("user");

-- RenameForeignKey
ALTER TABLE "public"."stat_event" RENAME CONSTRAINT "StatEvent_from_publisher_id_fkey" TO "stat_event_from_publisher_id_fkey";

-- RenameForeignKey
ALTER TABLE "public"."stat_event" RENAME CONSTRAINT "StatEvent_to_publisher_id_fkey" TO "stat_event_to_publisher_id_fkey";

-- RenameIndex
ALTER INDEX "public"."StatEvent_es_id_key" RENAME TO "stat_event_es_id_key";
