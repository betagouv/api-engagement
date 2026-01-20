/*
  Warnings:

  - You are about to drop the `OrganizationExclusion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."OrganizationExclusion" DROP CONSTRAINT "OrganizationExclusion_excluded_by_publisher_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrganizationExclusion" DROP CONSTRAINT "OrganizationExclusion_excluded_for_publisher_id_fkey";

-- DropTable
DROP TABLE "public"."OrganizationExclusion";
