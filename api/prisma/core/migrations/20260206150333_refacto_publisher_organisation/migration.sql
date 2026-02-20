/*
  Warnings:

  - You are about to drop the column `organization_id` on the `mission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "mission" DROP CONSTRAINT "mission_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "mission" DROP CONSTRAINT "mission_publisher_id_organization_client_id_fkey";

-- AlterTable
ALTER TABLE "mission" ADD COLUMN "publisher_organization_id" TEXT;

-- AlterTable: rename legacy columns to new names (instead of ADD + backfill)
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_client_id" TO "client_id";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_name" TO "name";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_rna" TO "rna";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_siren" TO "siren";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_siret" TO "siret";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_url" TO "url";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_logo" TO "logo";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_description" TO "description";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_status_juridique" TO "legal_status";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_type" TO "type";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_actions" TO "actions";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_full_address" TO "full_address";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_post_code" TO "postal_code";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_city" TO "city";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_beneficiaries" TO "beneficiaries";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_reseaux" TO "parent_organizations";
ALTER TABLE "publisher_organization" RENAME COLUMN "organization_verification_status" TO "verification_status";

ALTER TABLE "publisher_organization" ALTER COLUMN "client_id" DROP NOT NULL;

-- AlterTable: add new columns (not renames)
ALTER TABLE "publisher_organization" ADD COLUMN "organization_id_verified" TEXT;
ALTER TABLE "publisher_organization" ADD COLUMN "verified_at" TIMESTAMP(3);

-- RenameIndex: update index name for renamed column
ALTER INDEX "publisher_organization_organization_name_idx" RENAME TO "publisher_organization_name_idx";

-- AddForeignKey
ALTER TABLE "mission" ADD CONSTRAINT "mission_publisher_organization_id_fkey" FOREIGN KEY ("publisher_organization_id") REFERENCES "publisher_organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publisher_organization" ADD CONSTRAINT "publisher_organization_organization_id_verified_fkey" FOREIGN KEY ("organization_id_verified") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "publisher_organization_publisher_id_org_client_id_key" RENAME TO "publisher_organization_publisher_id_client_id_key";

-- AlterTable
ALTER TABLE "publisher_organization" ALTER COLUMN "client_id" SET NOT NULL;