/*
  Warnings:

  - You are about to drop the column `host` on the `Click` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Click" DROP COLUMN "host",
ADD COLUMN     "domain_origin" TEXT,
ADD COLUMN     "url_origin" TEXT;
