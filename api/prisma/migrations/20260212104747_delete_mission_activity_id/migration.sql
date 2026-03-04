/*
  Warnings:

  - You are about to drop the column `activity_id` on the `mission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "mission" DROP CONSTRAINT "mission_activity_id_fkey";

-- DropIndex
DROP INDEX "mission_activity_id_idx";

-- AlterTable
ALTER TABLE "mission" DROP COLUMN "activity_id";
