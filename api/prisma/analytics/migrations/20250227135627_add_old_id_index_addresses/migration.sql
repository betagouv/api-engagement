/*
  Warnings:

  - Added the required column `old_id` to the `Address` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "old_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "address_mission_id" ON "Address"("mission_id");

-- CreateIndex
CREATE INDEX "address_old_id" ON "Address"("old_id");

-- CreateIndex
CREATE INDEX "mission_old_id" ON "Mission"("old_id");
