/*
  Warnings:

  - You are about to drop the `Import` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Import" DROP CONSTRAINT "Import_partner_id_fkey";

-- DropTable
DROP TABLE "public"."Import";
