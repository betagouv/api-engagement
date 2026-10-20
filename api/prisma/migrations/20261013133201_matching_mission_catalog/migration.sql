-- CreateTable
CREATE TABLE "matching_mission_catalog" (
    "id" TEXT NOT NULL,
    "mission_scoring_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "mission_enrichment_id" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "enrichment_status" "MissionEnrichmentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matching_mission_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_mission_gate" (
    "id" TEXT NOT NULL,
    "mission_scoring_id" TEXT NOT NULL,
    "taxonomy_key" TEXT NOT NULL,
    "allowed_values" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matching_mission_gate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_catalog_state" (
    "prompt_version" TEXT NOT NULL,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "build_id" TEXT,
    "gate_taxonomies" TEXT[],
    "built_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matching_catalog_state_pkey" PRIMARY KEY ("prompt_version")
);

-- CreateIndex
CREATE UNIQUE INDEX "matching_catalog_scoring_key" ON "matching_mission_catalog"("mission_scoring_id");

-- CreateIndex
CREATE INDEX "matching_catalog_prompt_status_mission_idx" ON "matching_mission_catalog"("prompt_version", "enrichment_status", "mission_id", "mission_scoring_id");

-- CreateIndex
CREATE INDEX "matching_catalog_enrichment_idx" ON "matching_mission_catalog"("mission_enrichment_id");

-- CreateIndex
CREATE UNIQUE INDEX "matching_gate_scoring_taxonomy_key" ON "matching_mission_gate"("mission_scoring_id", "taxonomy_key");

-- AddForeignKey
ALTER TABLE "matching_mission_catalog" ADD CONSTRAINT "matching_mission_catalog_mission_scoring_id_fkey" FOREIGN KEY ("mission_scoring_id") REFERENCES "mission_scoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_mission_gate" ADD CONSTRAINT "matching_mission_gate_mission_scoring_id_fkey" FOREIGN KEY ("mission_scoring_id") REFERENCES "matching_mission_catalog"("mission_scoring_id") ON DELETE CASCADE ON UPDATE CASCADE;
