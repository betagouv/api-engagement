/*
  Warnings:

  - You are about to drop the column `organization_id` on the `mission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "mission" DROP CONSTRAINT "mission_organization_id_fkey";

-- AlterTable
ALTER TABLE "mission" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "publisher_organization" ADD COLUMN     "actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "beneficiaries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "city" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "full_address" TEXT,
ADD COLUMN     "legal_status" TEXT,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "organization_id_verified" TEXT,
ADD COLUMN     "parent_organizations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "rna" TEXT,
ADD COLUMN     "rna_verified" TEXT,
ADD COLUMN     "siren" TEXT,
ADD COLUMN     "siren_verified" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "siret_verified" TEXT,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "url" TEXT,
ADD COLUMN     "verified_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "publisher_organization" ADD CONSTRAINT "publisher_organization_organization_id_verified_fkey" FOREIGN KEY ("organization_id_verified") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "publisher_organization_publisher_id_org_client_id_key" RENAME TO "publisher_organization_publisher_id_organization_client_id_key";
