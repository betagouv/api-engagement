-- CreateIndex
CREATE UNIQUE INDEX "publisher_diffusion_rule_publisher_field_value_key" ON "publisher_diffusion_rule"("publisher_id", "field", "value");
