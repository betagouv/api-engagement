-- AlterTable
ALTER TABLE "mission_diffusion" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "mission_diffusion_created_at_idx" ON "mission_diffusion"("created_at");
