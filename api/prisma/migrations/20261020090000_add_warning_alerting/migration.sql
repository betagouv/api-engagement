-- CreateEnum
CREATE TYPE "WarningStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'RESOLVED');

-- AlterTable
ALTER TABLE "warning" ADD COLUMN "status" "WarningStatus" NOT NULL DEFAULT 'TODO',
ADD COLUMN "procedure_url" TEXT,
ADD COLUMN "notified_at" TIMESTAMP(3);

-- Backfill : les warnings déjà corrigés sont résolus
UPDATE "warning" SET "status" = 'RESOLVED' WHERE "fixed" = true;

-- Les warnings existants précèdent l'alerting : considérés comme déjà notifiés
UPDATE "warning" SET "notified_at" = "created_at";

-- `fixed` (déprécié) et `status` ne peuvent plus diverger
ALTER TABLE "warning" ADD CONSTRAINT "warning_status_fixed_check" CHECK (("status" = 'RESOLVED') = "fixed");

-- Une seule alerte ouverte par (annonceur, type) : résout les doublons éventuels (on garde la plus récente) avant l'index unique
UPDATE "warning" SET "status" = 'RESOLVED', "fixed" = true, "fixed_at" = NOW()
WHERE "status" <> 'RESOLVED' AND "id" NOT IN (
  SELECT DISTINCT ON ("publisher_id", "type") "id" FROM "warning" WHERE "status" <> 'RESOLVED' ORDER BY "publisher_id", "type", "created_at" DESC
);

CREATE UNIQUE INDEX "warning_open_publisher_type_key" ON "warning"("publisher_id", "type") WHERE "status" <> 'RESOLVED';

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
