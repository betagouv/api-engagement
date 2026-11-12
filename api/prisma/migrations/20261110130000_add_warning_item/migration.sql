-- AlterTable
ALTER TABLE "warning" ADD COLUMN "item_id" TEXT,
ADD COLUMN "item_label" TEXT;

-- Une alerte ouverte par (annonceur, type, clé) ; sans clé, une par (annonceur, type) comme avant (COALESCE : les NULL sont distincts en unique)
DROP INDEX "warning_open_publisher_type_key";
CREATE UNIQUE INDEX "warning_open_publisher_type_item_key" ON "warning"("publisher_id", "type", COALESCE("item_id", '')) WHERE "status" <> 'RESOLVED';
