-- AlterTable
ALTER TABLE "mission_enrichment_value"
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "mission_enrichment_value"
SET "updated_at" = CURRENT_TIMESTAMP
WHERE "updated_at" IS NULL;

ALTER TABLE "mission_enrichment_value"
ALTER COLUMN "updated_at" SET NOT NULL;
