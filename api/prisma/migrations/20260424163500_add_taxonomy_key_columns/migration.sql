-- AlterTable
ALTER TABLE "mission_enrichment_value"
ADD COLUMN "dimension_key" TEXT,
ADD COLUMN "value_key" TEXT,
ALTER COLUMN "taxonomy_value_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "mission_scoring_value"
ADD COLUMN "dimension_key" TEXT,
ADD COLUMN "value_key" TEXT,
ALTER COLUMN "taxonomy_value_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_scoring_value"
ADD COLUMN "dimension_key" TEXT,
ADD COLUMN "value_key" TEXT,
ALTER COLUMN "taxonomy_value_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "mission_enrichment_value_dimension_value_idx" ON "mission_enrichment_value"("dimension_key", "value_key");

-- CreateIndex
CREATE UNIQUE INDEX "mission_enrichment_value_dimension_value_unique" ON "mission_enrichment_value"("enrichment_id", "dimension_key", "value_key");

-- CreateIndex
CREATE INDEX "mission_scoring_value_dimension_value_idx" ON "mission_scoring_value"("dimension_key", "value_key");

-- CreateIndex
CREATE UNIQUE INDEX "mission_scoring_value_mission_scoring_dimension_value_key" ON "mission_scoring_value"("mission_scoring_id", "dimension_key", "value_key");

-- CreateIndex
CREATE INDEX "user_scoring_value_dimension_value_idx" ON "user_scoring_value"("dimension_key", "value_key");

-- CreateIndex
CREATE UNIQUE INDEX "user_scoring_value_user_scoring_dimension_value_key" ON "user_scoring_value"("user_scoring_id", "dimension_key", "value_key");
