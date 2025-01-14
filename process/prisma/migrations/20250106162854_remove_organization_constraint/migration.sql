/*
  Warnings:

  - The primary key for the `_PartnerToUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_PartnerToWidget` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_PartnerToUser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_PartnerToWidget` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Mission" DROP CONSTRAINT "Mission_organization_id_fkey";

-- AlterTable
ALTER TABLE "_PartnerToUser" DROP CONSTRAINT "_PartnerToUser_AB_pkey";

-- AlterTable
ALTER TABLE "_PartnerToWidget" DROP CONSTRAINT "_PartnerToWidget_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_PartnerToUser_AB_unique" ON "_PartnerToUser"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_PartnerToWidget_AB_unique" ON "_PartnerToWidget"("A", "B");
