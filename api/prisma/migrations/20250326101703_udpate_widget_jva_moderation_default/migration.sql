/*
  Warnings:

  - Made the column `jva_moderation` on table `Widget` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Widget" ALTER COLUMN "jva_moderation" SET NOT NULL,
ALTER COLUMN "jva_moderation" SET DEFAULT false;
