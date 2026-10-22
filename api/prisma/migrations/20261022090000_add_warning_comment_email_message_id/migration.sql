-- AlterTable
ALTER TABLE "warning_comment" ADD COLUMN "email_message_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "warning_comment_email_message_id_key" ON "warning_comment"("email_message_id");
