/*
  Warnings:

  - You are about to drop the `OrganizationNameMatch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_MissionToNameMatch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_OrganizationToNameMatch` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_MissionToNameMatch" DROP CONSTRAINT "_MissionToNameMatch_A_fkey";

-- DropForeignKey
ALTER TABLE "_MissionToNameMatch" DROP CONSTRAINT "_MissionToNameMatch_B_fkey";

-- DropForeignKey
ALTER TABLE "_OrganizationToNameMatch" DROP CONSTRAINT "_OrganizationToNameMatch_A_fkey";

-- DropForeignKey
ALTER TABLE "_OrganizationToNameMatch" DROP CONSTRAINT "_OrganizationToNameMatch_B_fkey";

-- DropTable
DROP TABLE "OrganizationNameMatch";

-- DropTable
DROP TABLE "_MissionToNameMatch";

-- DropTable
DROP TABLE "_OrganizationToNameMatch";

-- CreateIndex
CREATE INDEX "mission_organization_id" ON "Mission"("organization_id");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;