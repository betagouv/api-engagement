-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "organization_id" TEXT;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
