-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_mission_id_fkey";

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
