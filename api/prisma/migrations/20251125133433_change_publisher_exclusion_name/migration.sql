/*
  Warnings:

  - You are about to drop the `publisher_diffusion_exclusion_by_annonceur_for_diffuseur` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."publisher_diffusion_exclusion_by_annonceur_for_diffuseur" DROP CONSTRAINT "pde_excluded_by_annonceur_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."publisher_diffusion_exclusion_by_annonceur_for_diffuseur" DROP CONSTRAINT "pde_excluded_for_diffuseur_id_fkey";

-- DropTable
DROP TABLE "public"."publisher_diffusion_exclusion_by_annonceur_for_diffuseur";

-- CreateTable
CREATE TABLE "public"."publisher_diffusion_exclusion" (
    "id" TEXT NOT NULL,
    "excluded_by_annonceur_id" TEXT NOT NULL,
    "excluded_for_diffuseur_id" TEXT NOT NULL,
    "organization_client_id" TEXT,
    "organization_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publisher_diffusion_exclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publisher_diffusion_exclusion_for_diffuseur_id_idx" ON "public"."publisher_diffusion_exclusion"("excluded_for_diffuseur_id");

-- CreateIndex
CREATE UNIQUE INDEX "pde_by_annonceur_for_diffuseur_org_key" ON "public"."publisher_diffusion_exclusion"("excluded_by_annonceur_id", "excluded_for_diffuseur_id", "organization_client_id");

-- AddForeignKey
ALTER TABLE "public"."publisher_diffusion_exclusion" ADD CONSTRAINT "pde_excluded_by_annonceur_id_fkey" FOREIGN KEY ("excluded_by_annonceur_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."publisher_diffusion_exclusion" ADD CONSTRAINT "pde_excluded_for_diffuseur_id_fkey" FOREIGN KEY ("excluded_for_diffuseur_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
