-- AlterTable
ALTER TABLE "publisher_demarche_simplifiees" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- Les démarches archivées ne doivent plus bloquer la recréation du même numéro.
DROP INDEX "publisher_demarche_simplifiees_publisher_id_number_key";

CREATE UNIQUE INDEX "publisher_demarche_simplifiees_publisher_id_number_key"
ON "publisher_demarche_simplifiees" ("publisher_id", "number")
WHERE "deleted_at" IS NULL;
