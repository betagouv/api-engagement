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

-- Backfill from mission before adding the FK
INSERT INTO "public"."publisher_organization" (
    "id",
    "publisher_id",
    "organization_client_id",
    "organization_name",
    "organization_url",
    "organization_type",
    "organization_logo",
    "organization_description",
    "organization_full_address",
    "organization_rna",
    "organization_siren",
    "organization_siret",
    "organization_department",
    "organization_department_code",
    "organization_department_name",
    "organization_post_code",
    "organization_city",
    "organization_status_juridique",
    "organization_beneficiaries",
    "organization_actions",
    "organization_reseaux",
    "organization_name_verified",
    "organization_rna_verified",
    "organization_siren_verified",
    "organization_siret_verified",
    "organization_address_verified",
    "organization_city_verified",
    "organization_postal_code_verified",
    "organization_department_code_verified",
    "organization_department_name_verified",
    "organization_region_verified",
    "organization_verification_status",
    "organisation_is_rup",
    "created_at",
    "updated_at"
)
SELECT
    md5(m."publisher_id" || ':' || m."organization_client_id") AS "id",
    m."publisher_id",
    m."organization_client_id",
    m."organizationName",
    m."organizationUrl",
    m."organizationType",
    m."organizationLogo",
    m."organizationDescription",
    m."organizationFullAddress",
    m."organizationRNA",
    m."organizationSiren",
    m."organizationSiret",
    m."organizationDepartment",
    m."organizationDepartmentCode",
    m."organizationDepartmentName",
    m."organizationPostCode",
    m."organizationCity",
    m."organizationStatusJuridique",
    COALESCE(m."organizationBeneficiaries", ARRAY[]::TEXT[]),
    COALESCE(m."organizationActions", ARRAY[]::TEXT[]),
    COALESCE(m."organizationReseaux", ARRAY[]::TEXT[]),
    m."organizationNameVerified",
    m."organizationRNAVerified",
    m."organizationSirenVerified",
    m."organizationSiretVerified",
    m."organizationAddressVerified",
    m."organizationCityVerified",
    m."organizationPostalCodeVerified",
    m."organizationDepartmentCodeVerified",
    m."organizationDepartmentNameVerified",
    m."organizationRegionVerified",
    m."organizationVerificationStatus",
    m."organisationIsRUP",
    COALESCE(m."created_at", CURRENT_TIMESTAMP),
    COALESCE(m."updated_at", CURRENT_TIMESTAMP)
FROM (
    SELECT DISTINCT ON ("publisher_id", "organization_client_id") *
    FROM "public"."mission"
    WHERE "organization_client_id" IS NOT NULL AND "organization_client_id" <> ''
    ORDER BY "publisher_id", "organization_client_id", "updated_at" DESC
) AS m;

-- Normalize empty organization_client_id to NULL before adding the FK
UPDATE "public"."mission"
SET "organization_client_id" = NULL
WHERE "organization_client_id" = '';

-- CreateIndex
CREATE INDEX "publisher_organization_publisher_id_idx" ON "public"."publisher_organization"("publisher_id");

-- CreateIndex
CREATE INDEX "publisher_organization_organization_name_idx" ON "public"."publisher_organization"("organization_name");

-- CreateIndex
CREATE UNIQUE INDEX "publisher_organization_publisher_id_org_client_id_key" ON "public"."publisher_organization"("publisher_id", "organization_client_id");

-- AddForeignKey
ALTER TABLE "public"."publisher_organization" ADD CONSTRAINT "publisher_organization_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mission" ADD CONSTRAINT "mission_publisher_id_organization_client_id_fkey" FOREIGN KEY ("publisher_id", "organization_client_id") REFERENCES "public"."publisher_organization"("publisher_id", "organization_client_id") ON DELETE RESTRICT ON UPDATE CASCADE;
