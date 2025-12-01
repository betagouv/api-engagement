/*
  Warnings:

  - You are about to drop the `PartnerToUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."LoginHistory" DROP CONSTRAINT "LoginHistory_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PartnerToUser" DROP CONSTRAINT "PartnerToUser_partner_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PartnerToUser" DROP CONSTRAINT "PartnerToUser_user_id_fkey";

-- DropTable
DROP TABLE "public"."PartnerToUser";

-- DropTable
DROP TABLE "public"."User";
