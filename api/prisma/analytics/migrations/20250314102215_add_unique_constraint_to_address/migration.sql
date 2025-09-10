/*
  Warnings:

  - A unique constraint covering the columns `[mission_id,old_id]` on the table `Address` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "address_mission_id_old_id" ON "Address"("mission_id", "old_id");
