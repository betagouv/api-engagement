-- CreateEnum
CREATE TYPE "public"."ReportDataTemplate" AS ENUM ('BOTH', 'RECEIVED', 'SENT');

-- DropIndex
DROP INDEX "public"."stats_event_from_publisher_created_at_idx";

-- DropIndex
DROP INDEX "public"."stats_event_to_publisher_created_at_idx";

-- CreateTable
CREATE TABLE "public"."report" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "object_name" TEXT,
    "publisher_id" TEXT NOT NULL,
    "data_template" "public"."ReportDataTemplate",
    "sent_at" TIMESTAMP(3),
    "sent_to" TEXT[],
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_publisher_id_idx" ON "public"."report"("publisher_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_publisher_id_month_year_key" ON "public"."report"("publisher_id", "month", "year");

-- CreateIndex
CREATE INDEX "stats_event_from_publisher_created_at_idx" ON "public"."StatEvent"("from_publisher_id", "created_at");

-- CreateIndex
CREATE INDEX "stats_event_to_publisher_created_at_idx" ON "public"."StatEvent"("to_publisher_id", "created_at");

-- AddForeignKey
ALTER TABLE "public"."report" ADD CONSTRAINT "report_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
