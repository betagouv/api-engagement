-- AlterEnum
ALTER TYPE "WarningStatus" ADD VALUE 'IGNORED';

-- AlterTable
ALTER TABLE "warning" ADD COLUMN "ignored_at" TIMESTAMP(3);
