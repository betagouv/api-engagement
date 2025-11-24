/*
  Warnings:

  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Mission" DROP CONSTRAINT "Mission_matched_organization_id_fkey";

-- DropTable
DROP TABLE "public"."Organization";
