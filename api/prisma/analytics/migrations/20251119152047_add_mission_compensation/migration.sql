-- AlterTable
ALTER TABLE "public"."Mission" ADD COLUMN     "compensation_amount" DOUBLE PRECISION,
ADD COLUMN     "compensation_type" TEXT,
ADD COLUMN     "compensation_unit" TEXT;
