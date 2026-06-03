-- DropIndex
DROP INDEX "publisher_diffusion_rule_publisher_field_value_key";

-- CreateIndex
CREATE UNIQUE INDEX "publisher_diffusion_rule_publisher_combined_field_value_key" ON "publisher_diffusion_rule"("publisher_id", "combined_with_id", "field", "value");
