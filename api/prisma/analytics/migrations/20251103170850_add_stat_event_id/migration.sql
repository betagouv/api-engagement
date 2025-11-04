-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "stat_event_id" TEXT;

-- AlterTable
ALTER TABLE "public"."Apply" ADD COLUMN     "stat_event_id" TEXT;

-- AlterTable
ALTER TABLE "public"."Click" ADD COLUMN     "stat_event_id" TEXT;

-- AlterTable
ALTER TABLE "public"."Impression" ADD COLUMN     "stat_event_id" TEXT;
