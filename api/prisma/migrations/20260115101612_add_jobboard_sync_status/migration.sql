-- CreateEnum
CREATE TYPE "public"."MissionJobBoardSyncStatus" AS ENUM ('ONLINE', 'OFFLINE', 'ERROR');

-- AlterTable
ALTER TABLE "public"."mission_jobboard" ADD COLUMN     "sync_status" "public"."MissionJobBoardSyncStatus";
