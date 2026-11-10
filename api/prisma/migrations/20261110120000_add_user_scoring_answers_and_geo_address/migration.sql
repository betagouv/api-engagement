-- AlterTable
ALTER TABLE "user_scoring" ADD COLUMN     "answers" JSONB;

-- AlterTable
ALTER TABLE "user_scoring_geo" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT;
