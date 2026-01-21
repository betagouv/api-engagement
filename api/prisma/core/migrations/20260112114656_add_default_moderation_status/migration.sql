/*
  Warnings:

  - Made the column `status` on table `mission_moderation_status` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "mission_moderation_status" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';
