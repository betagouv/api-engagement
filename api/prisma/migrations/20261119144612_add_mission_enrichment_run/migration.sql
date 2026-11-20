-- CreateTable
CREATE TABLE "mission_enrichment_run" (
    "id" TEXT NOT NULL,
    "mission_enrichment_id" TEXT,
    "prompt_version" TEXT NOT NULL,
    "status" "MissionEnrichmentStatus" NOT NULL DEFAULT 'processing',
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "total_tokens" INTEGER,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_enrichment_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_enrichment_run_enrichment_idx" ON "mission_enrichment_run"("mission_enrichment_id");

-- CreateIndex
CREATE INDEX "mission_enrichment_run_updated_id_idx" ON "mission_enrichment_run"("updated_at", "id");

-- AddForeignKey
ALTER TABLE "mission_enrichment_run" ADD CONSTRAINT "mission_enrichment_run_mission_enrichment_id_fkey" FOREIGN KEY ("mission_enrichment_id") REFERENCES "mission_enrichment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
