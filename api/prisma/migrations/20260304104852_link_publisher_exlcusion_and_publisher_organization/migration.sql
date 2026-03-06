-- DropIndex
DROP INDEX "mission_address_mission_lat_lon_idx";

-- AlterTable
ALTER TABLE "publisher_diffusion_exclusion" ADD COLUMN     "publisher_organization_id" TEXT;

-- CreateIndex
CREATE INDEX "publisher_diffusion_exclusion_publisher_organization_id_idx" ON "publisher_diffusion_exclusion"("publisher_organization_id");

-- AddForeignKey
ALTER TABLE "publisher_diffusion_exclusion" ADD CONSTRAINT "publisher_diffusion_exclusion_publisher_organization_id_fkey" FOREIGN KEY ("publisher_organization_id") REFERENCES "publisher_organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
