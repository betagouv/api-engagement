/*
  Warnings:

  - You are about to drop the column `location` on the `Widget` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Widget" DROP COLUMN "location",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "postal_code" TEXT;
