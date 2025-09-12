-- AlterTable
ALTER TABLE "public"."Organization" ALTER COLUMN "short_title_slug" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "organization_old_id" ON "public"."Organization"("old_id");
