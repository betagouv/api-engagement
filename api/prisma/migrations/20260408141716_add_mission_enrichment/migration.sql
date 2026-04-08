-- CreateEnum
CREATE TYPE "TaxonomyType" AS ENUM ('categorical', 'multi_value', 'ordered', 'gate');

-- CreateEnum
CREATE TYPE "MissionEnrichmentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "taxonomy" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "TaxonomyType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxonomy_value" (
    "id" TEXT NOT NULL,
    "taxonomy_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxonomy_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_enrichment" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "status" "MissionEnrichmentStatus" NOT NULL DEFAULT 'pending',
    "prompt_version" TEXT NOT NULL,
    "raw_response" JSONB,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "total_tokens" INTEGER,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_enrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_enrichment_value" (
    "id" TEXT NOT NULL,
    "enrichment_id" TEXT NOT NULL,
    "taxonomy_value_id" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB,

    CONSTRAINT "mission_enrichment_value_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "taxonomy_key_key" ON "taxonomy"("key");

-- CreateIndex
CREATE INDEX "taxonomy_value_taxonomy_id_idx" ON "taxonomy_value"("taxonomy_id");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomy_value_taxonomy_key_unique" ON "taxonomy_value"("taxonomy_id", "key");

-- CreateIndex
CREATE INDEX "mission_enrichment_mission_version_idx" ON "mission_enrichment"("mission_id", "prompt_version");

-- CreateIndex
CREATE INDEX "mission_enrichment_status_idx" ON "mission_enrichment"("status");

-- CreateIndex
CREATE INDEX "mission_enrichment_value_enrichment_id_idx" ON "mission_enrichment_value"("enrichment_id");

-- CreateIndex
CREATE INDEX "mission_enrichment_value_taxonomy_value_id_idx" ON "mission_enrichment_value"("taxonomy_value_id");

-- AddForeignKey
ALTER TABLE "taxonomy_value" ADD CONSTRAINT "taxonomy_value_taxonomy_id_fkey" FOREIGN KEY ("taxonomy_id") REFERENCES "taxonomy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_enrichment" ADD CONSTRAINT "mission_enrichment_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_enrichment_value" ADD CONSTRAINT "mission_enrichment_value_enrichment_id_fkey" FOREIGN KEY ("enrichment_id") REFERENCES "mission_enrichment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_enrichment_value" ADD CONSTRAINT "mission_enrichment_value_taxonomy_value_id_fkey" FOREIGN KEY ("taxonomy_value_id") REFERENCES "taxonomy_value"("id") ON DELETE CASCADE ON UPDATE CASCADE;
