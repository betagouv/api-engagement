-- AlterTable
ALTER TABLE "mission_diffusion" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "mission_diffusion_distribution_publisher_active_idx" ON "mission_diffusion"("distribution_publisher_id", "is_deleted", "mission_id");

-- CreateIndex
CREATE INDEX "mission_diffusion_updated_at_idx" ON "mission_diffusion"("updated_at");
