-- Démarches Simplifiées : une table dédiée pour rattacher plusieurs démarches à un publisher.
CREATE TABLE "publisher_demarche_simplifiees" (
    "id" TEXT NOT NULL,
    "publisher_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "url" TEXT,
    "annotation_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publisher_demarche_simplifiees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "publisher_demarche_simplifiees_publisher_id_number_key" ON "publisher_demarche_simplifiees"("publisher_id", "number");

CREATE INDEX "publisher_demarche_simplifiees_publisher_id_idx" ON "publisher_demarche_simplifiees"("publisher_id");

CREATE INDEX "publisher_demarche_simplifiees_number_idx" ON "publisher_demarche_simplifiees"("number");

ALTER TABLE "publisher_demarche_simplifiees" ADD CONSTRAINT "publisher_demarche_simplifiees_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
