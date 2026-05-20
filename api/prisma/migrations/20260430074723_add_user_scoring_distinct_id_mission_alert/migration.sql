-- AlterTable
ALTER TABLE "user_scoring" ADD COLUMN     "distinct_id" TEXT,
ADD COLUMN     "mission_alert_enabled" BOOLEAN NOT NULL DEFAULT false;
