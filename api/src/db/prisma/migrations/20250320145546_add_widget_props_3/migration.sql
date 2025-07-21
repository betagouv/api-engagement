/*
  Warnings:

  - The `style` column on the `Widget` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "WidgetStyle" AS ENUM ('carousel', 'page');

-- AlterTable
ALTER TABLE "Widget" DROP COLUMN "style",
ADD COLUMN     "style" "WidgetStyle";
