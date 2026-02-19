/*
  Warnings:

  - A unique constraint covering the columns `[client_event_id,to_publisher_id,type]` on the table `stat_event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "stat_event" ADD COLUMN     "client_event_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stat_event_client_event_id_to_publisher_type_key" ON "stat_event"("client_event_id", "to_publisher_id", "type");
