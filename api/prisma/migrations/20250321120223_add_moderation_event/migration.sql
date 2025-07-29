/*
  Warnings:

  - You are about to drop the column `deleted` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ModerationEventStatus" AS ENUM ('accepted', 'refused', 'pending', 'ongoing');

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "jva_moderation_user_id" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "deleted";

-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "initial_status" "ModerationEventStatus",
    "new_status" "ModerationEventStatus",
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

    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModerationEvent_old_id_key" ON "ModerationEvent"("old_id");

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
