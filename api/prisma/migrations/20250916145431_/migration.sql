/*
  Warnings:

  - A unique constraint covering the columns `[es_id]` on the table `StatEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."StatEvent" ADD COLUMN     "es_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StatEvent_es_id_key" ON "public"."StatEvent"("es_id");
