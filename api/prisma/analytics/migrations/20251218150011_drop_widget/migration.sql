/*
  Warnings:

  - You are about to drop the `PartnerToWidget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Widget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WidgetQuery` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_widget_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Apply" DROP CONSTRAINT "Apply_widget_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Click" DROP CONSTRAINT "Click_widget_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Impression" DROP CONSTRAINT "Impression_widget_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PartnerToWidget" DROP CONSTRAINT "PartnerToWidget_partner_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PartnerToWidget" DROP CONSTRAINT "PartnerToWidget_widget_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Widget" DROP CONSTRAINT "Widget_diffuseur_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."WidgetQuery" DROP CONSTRAINT "WidgetQuery_widget_id_fkey";

-- DropTable
DROP TABLE "public"."PartnerToWidget";

-- DropTable
DROP TABLE "public"."Widget";

-- DropTable
DROP TABLE "public"."WidgetQuery";

-- DropEnum
DROP TYPE "public"."WidgetStyle";
