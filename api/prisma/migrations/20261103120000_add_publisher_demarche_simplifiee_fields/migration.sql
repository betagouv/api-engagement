-- CreateEnum
CREATE TYPE "DemarcheSimplifieeFieldType" AS ENUM ('BIRTH_DATE', 'COUNTRY', 'POSTAL_CODE');

-- CreateTable
CREATE TABLE "publisher_demarche_simplifiee_fields" (
    "id" TEXT NOT NULL,
    "demarche_id" TEXT NOT NULL,
    "type" "DemarcheSimplifieeFieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publisher_demarche_simplifiee_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publisher_demarche_simplifiee_fields_demarche_id_type_key" ON "publisher_demarche_simplifiee_fields"("demarche_id", "type");

-- AddForeignKey
ALTER TABLE "publisher_demarche_simplifiee_fields" ADD CONSTRAINT "publisher_demarche_simplifiee_fields_demarche_id_fkey" FOREIGN KEY ("demarche_id") REFERENCES "publisher_demarche_simplifiees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
