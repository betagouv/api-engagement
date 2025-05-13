/*
  Warnings:

  - You are about to drop the column `forgot_password_reset_token` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `last_login_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `MissionHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MissionHistoryEventType" AS ENUM ('Created', 'Deleted', 'UpdatedStartDate', 'UpdatedEndDate', 'UpdatedDescription', 'UpdatedActivityDomain', 'UpdatedPlaces', 'UpdatedJVAModerationStatus', 'UpdatedApiEngModerationStatus', 'UpdatedOther');

-- DropForeignKey
ALTER TABLE "MissionHistory" DROP CONSTRAINT "MissionHistory_mission_id_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "forgot_password_reset_token",
DROP COLUMN "last_login_at",
ADD COLUMN     "brevo_contact_id" INTEGER,
ADD COLUMN     "forgot_password_expires_at" TIMESTAMP(3),
ADD COLUMN     "forgot_password_token" TEXT,
ADD COLUMN     "invitation_expires_at" TIMESTAMP(3),
ADD COLUMN     "invitation_token" TEXT,
ADD COLUMN     "last_activity_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "invitation_completed_at" DROP DEFAULT;

-- DropTable
DROP TABLE "MissionHistory";

-- CreateTable
CREATE TABLE "MissionHistoryEvent" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MissionHistoryEventType" NOT NULL,
    "mission_id" TEXT NOT NULL,

    CONSTRAINT "MissionHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissionHistoryEvent_mission_id_idx" ON "MissionHistoryEvent"("mission_id");

-- AddForeignKey
ALTER TABLE "MissionHistoryEvent" ADD CONSTRAINT "MissionHistoryEvent_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
