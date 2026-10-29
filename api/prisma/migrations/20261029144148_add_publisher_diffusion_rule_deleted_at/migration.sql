-- DropIndex
DROP INDEX "publisher_diffusion_rule_publisher_combined_field_value_key";

-- AlterTable
ALTER TABLE "publisher_diffusion_rule" ADD COLUMN     "deleted_at" TIMESTAMP(3);
