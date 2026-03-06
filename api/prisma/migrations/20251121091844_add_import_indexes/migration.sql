-- CreateIndex
CREATE INDEX "import_publisher_started_at_desc_idx" ON "public"."import"("publisher_id", "started_at" DESC);