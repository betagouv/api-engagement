-- CreateEnum
CREATE TYPE "public"."EmailStatus" AS ENUM ('PENDING', 'PROCESSED', 'DUPLICATE', 'FAILED');

-- CreateTable
CREATE TABLE "public"."email" (
    "id" TEXT NOT NULL,
    "message_id" TEXT,
    "in_reply_to" TEXT,
    "from_name" TEXT,
    "from_email" TEXT,
    "to" JSONB,
    "to_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT,
    "sent_at" TIMESTAMP(3),
    "raw_text_body" TEXT,
    "raw_html_body" TEXT,
    "md_text_body" TEXT,
    "attachments" JSONB,
    "raw" JSONB,
    "status" "public"."EmailStatus" NOT NULL DEFAULT 'PENDING',
    "report_url" TEXT,
    "file_object_name" TEXT,
    "date_from" TIMESTAMP(3),
    "date_to" TIMESTAMP(3),
    "created_count" INTEGER,
    "failed" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_status_idx" ON "public"."email"("status");

-- CreateIndex
CREATE INDEX "email_date_from_to_idx" ON "public"."email"("date_from", "date_to");

-- CreateIndex
CREATE INDEX "email_to_emails_idx" ON "public"."email" USING GIN ("to_emails");
