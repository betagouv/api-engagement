/*
  Warnings:

  - Made the column `is_bot` on table `Click` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_human` on table `Click` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Click" ALTER COLUMN "is_bot" SET NOT NULL,
ALTER COLUMN "is_bot" SET DEFAULT false,
ALTER COLUMN "is_human" SET NOT NULL,
ALTER COLUMN "is_human" SET DEFAULT false;
