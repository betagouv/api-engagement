-- CreateIndex
CREATE INDEX "mission_scoring_value_taxonomy_value_scoring_score_idx" ON "mission_scoring_value"("taxonomy_key", "value_key", "mission_scoring_id", "score");
