-- CreateTable
CREATE TABLE "warning_occurrence" (
    "id" TEXT NOT NULL,
    "warning_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warning_occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warning_occurrence_warning_id_created_at_idx" ON "warning_occurrence"("warning_id", "created_at");

-- AddForeignKey
ALTER TABLE "warning_occurrence" ADD CONSTRAINT "warning_occurrence_warning_id_fkey" FOREIGN KEY ("warning_id") REFERENCES "warning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Une ligne initiale pour les alertes encore ouvertes, afin que leur historique ne démarre pas vide
-- (source déduite : une alerte notifiée ou assignée vient du webhook d'alertes, sinon d'un ancien job)
INSERT INTO "warning_occurrence" ("id", "warning_id", "source", "title", "description", "created_at")
SELECT
    gen_random_uuid()::text,
    w."id",
    CASE WHEN w."notified_at" IS NOT NULL OR EXISTS (SELECT 1 FROM "warning_assignee" a WHERE a."warning_id" = w."id") THEN 'metabase' ELSE 'job' END,
    w."title",
    w."description",
    w."created_at"
FROM "warning" w
WHERE w."status" <> 'RESOLVED';
