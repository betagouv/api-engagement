/*
  Warnings:

  - Made the column `client_id` on table `publisher_organization` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "mission_address_mission_lat_lon_idx";

-- AlterTable
ALTER TABLE "publisher_organization" ALTER COLUMN "client_id" SET NOT NULL;
