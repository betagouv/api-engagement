-- CreateEnum
CREATE TYPE "public"."ReportDataTemplate" AS ENUM ('BOTH', 'RECEIVED', 'SENT');

-- CreateTable
CREATE TABLE "public"."report" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "object_name" TEXT,
    "publisher_id" TEXT NOT NULL,
    "publisher_name" TEXT NOT NULL,
    "data_template" "public"."ReportDataTemplate",
    "sent_at" TIMESTAMP(3),
    "sent_to" TEXT[],
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_publisher_id_month_year_idx" ON "public"."report"("publisher_id", "month", "year");
