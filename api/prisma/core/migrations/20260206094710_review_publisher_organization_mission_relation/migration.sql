-- DropForeignKey
ALTER TABLE "mission" DROP CONSTRAINT "mission_publisher_id_organization_client_id_fkey";

-- AddForeignKey
ALTER TABLE "mission" ADD CONSTRAINT "mission_publisher_organization_id_fkey" FOREIGN KEY ("publisher_organization_id") REFERENCES "publisher_organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
