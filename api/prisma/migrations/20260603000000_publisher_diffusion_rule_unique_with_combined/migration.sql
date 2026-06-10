-- DropIndex
DROP INDEX "publisher_diffusion_rule_publisher_field_value_key";

-- CreateIndex
CREATE UNIQUE INDEX "publisher_diffusion_rule_publisher_combined_field_value_key" ON "publisher_diffusion_rule"("publisher_id", "combined_with_id", "field", "value");

-- CreateIndex
-- Garde-fou d'unicité pour les règles racines (combined_with_id NULL) : l'index ci-dessus ne les protège pas
-- car Postgres considère les NULL comme distincts. Index partiel pour garantir un seul root par (publisher, field, value).
CREATE UNIQUE INDEX "publisher_diffusion_rule_root_publisher_field_value_key" ON "publisher_diffusion_rule"("publisher_id", "field", "value") WHERE "combined_with_id" IS NULL;
