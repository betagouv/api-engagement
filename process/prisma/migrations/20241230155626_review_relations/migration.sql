/*
  Warnings:

  - You are about to drop the column `organization_id` on the `Mission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Mission" DROP COLUMN "organization_id";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "rna" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "rup_mi" TEXT NOT NULL,
    "gestion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_declared_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "dissolved_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "nature" TEXT NOT NULL,
    "groupement" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_title" TEXT NOT NULL,
    "title_slug" TEXT NOT NULL,
    "short_title_slug" TEXT NOT NULL,
    "names" TEXT[],
    "object" TEXT NOT NULL,
    "social_object1" TEXT NOT NULL,
    "social_object2" TEXT NOT NULL,
    "address_complement" TEXT NOT NULL,
    "address_number" TEXT NOT NULL,
    "address_repetition" TEXT NOT NULL,
    "address_type" TEXT NOT NULL,
    "address_street" TEXT NOT NULL,
    "address_distribution" TEXT NOT NULL,
    "address_insee_code" TEXT NOT NULL,
    "address_postal_code" TEXT NOT NULL,
    "address_department_code" TEXT NOT NULL,
    "address_department_name" TEXT NOT NULL,
    "address_region" TEXT NOT NULL,
    "address_city" TEXT NOT NULL,
    "management_declarant" TEXT NOT NULL,
    "management_complement" TEXT NOT NULL,
    "management_street" TEXT NOT NULL,
    "management_distribution" TEXT NOT NULL,
    "management_postal_code" TEXT NOT NULL,
    "management_city" TEXT NOT NULL,
    "management_country" TEXT NOT NULL,
    "director_civility" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "sync_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PartnerToWidget" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PartnerToWidget_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_old_id_key" ON "Organization"("old_id");

-- CreateIndex
CREATE INDEX "_PartnerToWidget_B_index" ON "_PartnerToWidget"("B");

-- AddForeignKey
ALTER TABLE "_PartnerToWidget" ADD CONSTRAINT "_PartnerToWidget_A_fkey" FOREIGN KEY ("A") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PartnerToWidget" ADD CONSTRAINT "_PartnerToWidget_B_fkey" FOREIGN KEY ("B") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
