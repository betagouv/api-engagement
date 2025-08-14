-- AlterTable
ALTER TABLE "public"."Mission" ADD COLUMN     "domain_logo" TEXT;

-- AlterTable
ALTER TABLE "public"."MissionHistoryEvent" ADD COLUMN     "changes" JSONB;
