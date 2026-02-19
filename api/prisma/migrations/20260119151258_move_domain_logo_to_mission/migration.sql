/*
  Warnings:

  - You are about to drop the column `logo` on the `domain` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."domain" DROP COLUMN "logo";

-- AlterTable
ALTER TABLE "public"."mission" ADD COLUMN     "domain_logo" TEXT;
