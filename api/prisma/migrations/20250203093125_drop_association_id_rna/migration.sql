/*
  Warnings:

  - You are about to drop the column `association_id` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `association_rna` on the `Mission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Mission" DROP COLUMN "association_id",
DROP COLUMN "association_rna";
