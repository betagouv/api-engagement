-- CreateTable
CREATE TABLE "public"."warning_bot" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "print_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "apply_count" INTEGER NOT NULL DEFAULT 0,
    "account_count" INTEGER NOT NULL DEFAULT 0,
    "publisher_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warning_bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warning_bot_hash_idx" ON "public"."warning_bot"("hash");

-- CreateIndex
CREATE INDEX "warning_bot_publisher_id_idx" ON "public"."warning_bot"("publisher_id");

-- CreateIndex
CREATE INDEX "warning_bot_created_at_idx" ON "public"."warning_bot"("created_at");

-- AddForeignKey
ALTER TABLE "public"."warning_bot" ADD CONSTRAINT "warning_bot_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
