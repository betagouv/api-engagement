-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "organization_address_verified" TEXT,
ADD COLUMN     "organization_city_verified" TEXT,
ADD COLUMN     "organization_department_code_verified" TEXT,
ADD COLUMN     "organization_department_name_verified" TEXT,
ADD COLUMN     "organization_is_rup" BOOLEAN,
ADD COLUMN     "organization_name_verified" TEXT,
ADD COLUMN     "organization_postal_code_verified" TEXT,
ADD COLUMN     "organization_region_verified" TEXT,
ADD COLUMN     "organization_rna_verified" TEXT,
ADD COLUMN     "organization_siren_verified" TEXT,
ADD COLUMN     "organization_siret_verified" TEXT,
ADD COLUMN     "organization_verification_status" TEXT;
