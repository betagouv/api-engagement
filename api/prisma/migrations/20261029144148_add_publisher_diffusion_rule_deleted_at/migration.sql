-- DropIndex
DROP INDEX "publisher_diffusion_rule_publisher_combined_field_value_key";

-- AlterTable
ALTER TABLE "publisher_diffusion_rule" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- Les règles archivées ne doivent plus bloquer la création d’une règle identique.
DROP INDEX "publisher_diffusion_rule_root_publisher_field_value_key";

CREATE UNIQUE INDEX "publisher_diffusion_rule_root_publisher_field_value_key"
ON "publisher_diffusion_rule" ("publisher_id", "field", "value")
WHERE "combined_with_id" IS NULL AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX "publisher_diffusion_rule_publisher_combined_field_value_key"
ON "publisher_diffusion_rule" ("publisher_id", "combined_with_id", "field", "value")
WHERE "deleted_at" IS NULL;
