/*
  Warnings:

  - You are about to drop the `ModerationEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ModerationEvent" DROP CONSTRAINT "ModerationEvent_mission_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ModerationEvent" DROP CONSTRAINT "ModerationEvent_user_id_fkey";

-- DropTable
DROP TABLE "public"."ModerationEvent";

-- DropEnum
DROP TYPE "public"."ModerationEventStatus";
