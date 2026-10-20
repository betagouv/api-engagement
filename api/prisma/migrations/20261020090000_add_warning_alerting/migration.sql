-- CreateEnum
CREATE TYPE "WarningStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'RESOLVED');

-- AlterTable
ALTER TABLE "warning" ADD COLUMN "status" "WarningStatus" NOT NULL DEFAULT 'TODO',
ADD COLUMN "procedure_url" TEXT;

-- Backfill : les warnings déjà corrigés sont résolus
UPDATE "warning" SET "status" = 'RESOLVED' WHERE "fixed" = true;

-- CreateTable
CREATE TABLE "warning_assignee" (
    "warning_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warning_assignee_pkey" PRIMARY KEY ("warning_id","user_id")
);

-- CreateIndex
CREATE INDEX "warning_assignee_user_id_idx" ON "warning_assignee"("user_id");

-- AddForeignKey
ALTER TABLE "warning_assignee" ADD CONSTRAINT "warning_assignee_warning_id_fkey" FOREIGN KEY ("warning_id") REFERENCES "warning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warning_assignee" ADD CONSTRAINT "warning_assignee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
