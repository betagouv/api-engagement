-- AlterTable
ALTER TABLE "publisher_diffusion_rule" ADD COLUMN "combined_with_id" TEXT;

-- CreateIndex
CREATE INDEX "publisher_diffusion_rule_combined_with_id_idx" ON "publisher_diffusion_rule"("combined_with_id");

-- AddForeignKey
ALTER TABLE "publisher_diffusion_rule" ADD CONSTRAINT "publisher_diffusion_rule_combined_with_id_fkey" FOREIGN KEY ("combined_with_id") REFERENCES "publisher_diffusion_rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
