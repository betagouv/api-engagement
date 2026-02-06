-- AlterTable
ALTER TABLE "mission" ADD COLUMN     "publisher_organization_id" TEXT;

-- AlterTable
ALTER TABLE "publisher_organization" ADD COLUMN     "client_id" TEXT;
