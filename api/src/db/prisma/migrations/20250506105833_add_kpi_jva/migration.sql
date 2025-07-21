/*
  Warnings:

  - Added the required column `available_jva_mission_count` to the `Kpi` table without a default value. This is not possible if the table is not empty.
  - Added the required column `available_jva_mission_count` to the `KpiBotLess` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Kpi" ADD COLUMN     "available_jva_mission_count" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "KpiBotLess" ADD COLUMN     "available_jva_mission_count" INTEGER NOT NULL;
