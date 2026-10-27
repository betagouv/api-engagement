-- CreateTable
CREATE TABLE "warning_comment" (
    "id" TEXT NOT NULL,
    "warning_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warning_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warning_comment_warning_id_created_at_idx" ON "warning_comment"("warning_id", "created_at");

-- AddForeignKey
ALTER TABLE "warning_comment" ADD CONSTRAINT "warning_comment_warning_id_fkey" FOREIGN KEY ("warning_id") REFERENCES "warning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warning_comment" ADD CONSTRAINT "warning_comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
