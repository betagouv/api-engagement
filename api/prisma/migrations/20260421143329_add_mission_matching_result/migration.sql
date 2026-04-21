/*
  Warnings:

  - Changed the type of `key` on the `taxonomy` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TaxonomyKey" AS ENUM ('domaine', 'secteur_activite', 'type_mission', 'accessibilite', 'format_activite', 'competence_rome', 'engagement_civique', 'niveau_engagement', 'region_internationale', 'engagement_intent', 'tranche_age', 'formation_onisep');

-- AlterTable
ALTER TABLE "taxonomy"
  ALTER COLUMN "key" TYPE "TaxonomyKey"
  USING ("key"::text::"TaxonomyKey");

-- CreateTable
CREATE TABLE "mission_matching_result" (
    "id" TEXT NOT NULL,
    "user_scoring_id" TEXT NOT NULL,
    "matching_engine_version" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_matching_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mission_matching_result_user_scoring_id_idx" ON "mission_matching_result"("user_scoring_id");

-- CreateIndex
CREATE UNIQUE INDEX "mission_matching_result_user_scoring_id_version_key" ON "mission_matching_result"("user_scoring_id", "matching_engine_version");

-- AddForeignKey
ALTER TABLE "mission_matching_result" ADD CONSTRAINT "mission_matching_result_user_scoring_id_fkey" FOREIGN KEY ("user_scoring_id") REFERENCES "user_scoring"("id") ON DELETE CASCADE ON UPDATE CASCADE;
