-- DropForeignKey
ALTER TABLE "OrganizationExclusion" DROP CONSTRAINT "OrganizationExclusion_excluded_by_publisher_id_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationExclusion" DROP CONSTRAINT "OrganizationExclusion_excluded_for_publisher_id_fkey";

-- AddForeignKey
ALTER TABLE "OrganizationExclusion" ADD CONSTRAINT "OrganizationExclusion_excluded_by_publisher_id_fkey" FOREIGN KEY ("excluded_by_publisher_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationExclusion" ADD CONSTRAINT "OrganizationExclusion_excluded_for_publisher_id_fkey" FOREIGN KEY ("excluded_for_publisher_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
