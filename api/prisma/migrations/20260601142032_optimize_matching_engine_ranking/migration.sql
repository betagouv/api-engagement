CREATE INDEX "mission_scoring_value_taxonomy_value_scoring_cover_idx"
  ON "mission_scoring_value" ("taxonomy_key", "value_key", "mission_scoring_id")
  INCLUDE ("score")
  WHERE "taxonomy_key" IS NOT NULL;