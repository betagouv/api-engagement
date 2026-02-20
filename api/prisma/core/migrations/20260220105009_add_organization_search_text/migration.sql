-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "search_text" TEXT;

-- CreateIndex
CREATE INDEX "organization_search_text_idx" ON "organization" USING GIN ("search_text" gin_trgm_ops);
