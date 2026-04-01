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
  - You are about to drop the column `organization_client_id` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organization_id` on the `mission` table. All the data in the column will be lost.
  - You are about to drop the column `organisation_is_rup` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_address_verified` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_city_verified` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_department` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_department_code` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_department_code_verified` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_department_name` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_department_name_verified` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_name_verified` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_postal_code_verified` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_region_verified` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_rna_verified` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_siren_verified` on the `publisher_organization` table. All the data in the column will be lost.
  - You are about to drop the column `organization_siret_verified` on the `publisher_organization` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "mission_organization_client_id_idx";

-- AlterTable
ALTER TABLE "mission" DROP COLUMN "organisationIsRUP",
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
DROP COLUMN "organizationVerificationStatus",
DROP COLUMN "organization_client_id",
DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "publisher_organization" DROP COLUMN "organisation_is_rup",
DROP COLUMN "organization_address_verified",
DROP COLUMN "organization_city_verified",
DROP COLUMN "organization_department",
DROP COLUMN "organization_department_code",
DROP COLUMN "organization_department_code_verified",
DROP COLUMN "organization_department_name",
DROP COLUMN "organization_department_name_verified",
DROP COLUMN "organization_name_verified",
DROP COLUMN "organization_postal_code_verified",
DROP COLUMN "organization_region_verified",
DROP COLUMN "organization_rna_verified",
DROP COLUMN "organization_siren_verified",
DROP COLUMN "organization_siret_verified";
