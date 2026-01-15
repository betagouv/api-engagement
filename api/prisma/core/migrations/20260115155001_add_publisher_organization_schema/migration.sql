/*
  Warnings:

  - You are about to drop the column `organisationIsRUP` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationActions` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationAddressVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationBeneficiaries` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationCity` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationCityVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationDepartment` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationDepartmentCode` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationDepartmentCodeVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationDepartmentName` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationDepartmentNameVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationDescription` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationFullAddress` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationLogo` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationName` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationNameVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationPostCode` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationPostalCodeVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationRNA` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationRNAVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationRegionVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationReseaux` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationSiren` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationSirenVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationSiret` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationSiretVerified` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationStatusJuridique` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationType` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationUrl` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organizationVerificationStatus` on the `mission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."mission" DROP COLUMN "organisationIsRUP",
DROP COLUMN "organizationActions",
DROP COLUMN "organizationAddressVerified",
DROP COLUMN "organizationBeneficiaries",
DROP COLUMN "organizationCity",
DROP COLUMN "organizationCityVerified",
DROP COLUMN "organizationDepartment",
DROP COLUMN "organizationDepartmentCode",
DROP COLUMN "organizationDepartmentCodeVerified",
DROP COLUMN "organizationDepartmentName",
DROP COLUMN "organizationDepartmentNameVerified",
DROP COLUMN "organizationDescription",
DROP COLUMN "organizationFullAddress",
DROP COLUMN "organizationLogo",
DROP COLUMN "organizationName",
DROP COLUMN "organizationNameVerified",
DROP COLUMN "organizationPostCode",
DROP COLUMN "organizationPostalCodeVerified",
DROP COLUMN "organizationRNA",
DROP COLUMN "organizationRNAVerified",
DROP COLUMN "organizationRegionVerified",
DROP COLUMN "organizationReseaux",
DROP COLUMN "organizationSiren",
DROP COLUMN "organizationSirenVerified",
DROP COLUMN "organizationSiret",
DROP COLUMN "organizationSiretVerified",
DROP COLUMN "organizationStatusJuridique",
DROP COLUMN "organizationType",
DROP COLUMN "organizationUrl",
DROP COLUMN "organizationVerificationStatus";

-- CreateTable
CREATE TABLE "public"."publisher_organization" (
    "id" TEXT NOT NULL,
    "publisher_id" TEXT NOT NULL,
    "organization_client_id" TEXT NOT NULL,
    "organization_name" TEXT,
    "organization_url" TEXT,
    "organization_type" TEXT,
    "organization_logo" TEXT,
    "organization_description" TEXT,
    "organization_full_address" TEXT,
    "organization_rna" TEXT,
    "organization_siren" TEXT,
    "organization_siret" TEXT,
    "organization_department" TEXT,
    "organization_department_code" TEXT,
    "organization_department_name" TEXT,
    "organization_post_code" TEXT,
    "organization_city" TEXT,
    "organization_status_juridique" TEXT,
    "organization_beneficiaries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organization_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organization_reseaux" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organization_name_verified" TEXT,
    "organization_rna_verified" TEXT,
    "organization_siren_verified" TEXT,
    "organization_siret_verified" TEXT,
    "organization_address_verified" TEXT,
    "organization_city_verified" TEXT,
    "organization_postal_code_verified" TEXT,
    "organization_department_code_verified" TEXT,
    "organization_department_name_verified" TEXT,
    "organization_region_verified" TEXT,
    "organization_verification_status" TEXT,
    "organisation_is_rup" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publisher_organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publisher_organization_publisher_id_idx" ON "public"."publisher_organization"("publisher_id");

-- CreateIndex
CREATE INDEX "publisher_organization_organization_name_idx" ON "public"."publisher_organization"("organization_name");

-- CreateIndex
CREATE UNIQUE INDEX "publisher_organization_publisher_id_org_client_id_key" ON "public"."publisher_organization"("publisher_id", "organization_client_id");

-- AddForeignKey
ALTER TABLE "public"."mission" ADD CONSTRAINT "mission_publisher_id_organization_client_id_fkey" FOREIGN KEY ("publisher_id", "organization_client_id") REFERENCES "public"."publisher_organization"("publisher_id", "organization_client_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."publisher_organization" ADD CONSTRAINT "publisher_organization_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
