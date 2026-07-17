-- CreateTable
CREATE TABLE "mission_diffusion" (
    "distribution_publisher_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,

    CONSTRAINT "mission_diffusion_pkey" PRIMARY KEY ("distribution_publisher_id","mission_id")
);

-- CreateIndex
CREATE INDEX "mission_diffusion_mission_id_idx" ON "mission_diffusion"("mission_id");

-- AddForeignKey
ALTER TABLE "mission_diffusion" ADD CONSTRAINT "mission_diffusion_distribution_publisher_id_fkey" FOREIGN KEY ("distribution_publisher_id") REFERENCES "publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_diffusion" ADD CONSTRAINT "mission_diffusion_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
