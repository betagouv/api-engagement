-- AlterTable
ALTER TABLE "matching_catalog_state" ADD COLUMN     "values_ready" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "matching_mission_value" (
    "id" TEXT NOT NULL,
    "mission_scoring_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "taxonomy_key" TEXT NOT NULL,
    "value_key" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matching_mission_value_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "matching_value_prompt_taxonomy_value_score_idx" ON "matching_mission_value"("prompt_version", "taxonomy_key", "value_key", "mission_scoring_id", "score");

-- CreateIndex
CREATE UNIQUE INDEX "matching_value_scoring_taxonomy_value_key" ON "matching_mission_value"("mission_scoring_id", "taxonomy_key", "value_key");

-- AddForeignKey
ALTER TABLE "matching_mission_value" ADD CONSTRAINT "matching_mission_value_mission_scoring_id_fkey" FOREIGN KEY ("mission_scoring_id") REFERENCES "matching_mission_catalog"("mission_scoring_id") ON DELETE CASCADE ON UPDATE CASCADE;
