-- AlterTable
ALTER TABLE "mission_enrichment_value"
ADD COLUMN "taxonomy_key" TEXT,
ADD COLUMN "value_key" TEXT,
ALTER COLUMN "taxonomy_value_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "mission_scoring_value"
ADD COLUMN "taxonomy_key" TEXT,
ADD COLUMN "value_key" TEXT,
ALTER COLUMN "taxonomy_value_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_scoring_value"
ADD COLUMN "taxonomy_key" TEXT,
ADD COLUMN "value_key" TEXT,
ALTER COLUMN "taxonomy_value_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "mission_enrichment_value_taxonomy_value_idx" ON "mission_enrichment_value"("taxonomy_key", "value_key");

-- CreateIndex
CREATE UNIQUE INDEX "mission_enrichment_value_taxonomy_value_unique" ON "mission_enrichment_value"("enrichment_id", "taxonomy_key", "value_key");

-- CreateIndex
CREATE INDEX "mission_scoring_value_taxonomy_value_idx" ON "mission_scoring_value"("taxonomy_key", "value_key");

-- CreateIndex
CREATE UNIQUE INDEX "mission_scoring_value_mission_scoring_taxonomy_value_key_v2" ON "mission_scoring_value"("mission_scoring_id", "taxonomy_key", "value_key");

-- CreateIndex
CREATE INDEX "user_scoring_value_taxonomy_value_idx" ON "user_scoring_value"("taxonomy_key", "value_key");

-- CreateIndex
CREATE UNIQUE INDEX "user_scoring_value_user_scoring_taxonomy_value_key_v2" ON "user_scoring_value"("user_scoring_id", "taxonomy_key", "value_key");
