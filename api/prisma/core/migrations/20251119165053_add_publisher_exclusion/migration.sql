-- AlterTable
ALTER TABLE "public"."stat_event" RENAME CONSTRAINT "StatEvent_pkey" TO "stat_event_pkey";

-- CreateTable
CREATE TABLE "public"."publisher_diffusion_exclusion_by_annonceur_for_diffuseur" (
    "id" TEXT NOT NULL,
    "excluded_by_annonceur_id" TEXT NOT NULL,
    "excluded_for_diffuseur_id" TEXT NOT NULL,
    "organization_client_id" TEXT,
    "organization_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publisher_diffusion_exclusion_by_annonceur_for_diffuseur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publisher_diffusion_exclusion_for_diffuseur_id_idx" ON "public"."publisher_diffusion_exclusion_by_annonceur_for_diffuseur"("excluded_for_diffuseur_id");

-- CreateIndex
CREATE UNIQUE INDEX "pde_by_annonceur_for_diffuseur_org_key" ON "public"."publisher_diffusion_exclusion_by_annonceur_for_diffuseur"("excluded_by_annonceur_id", "excluded_for_diffuseur_id", "organization_client_id");

-- RenameForeignKey
ALTER TABLE "public"."stat_event" RENAME CONSTRAINT "StatEvent_from_publisher_id_fkey" TO "stat_event_from_publisher_id_fkey";

-- RenameForeignKey
ALTER TABLE "public"."stat_event" RENAME CONSTRAINT "StatEvent_to_publisher_id_fkey" TO "stat_event_to_publisher_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."publisher_diffusion_exclusion_by_annonceur_for_diffuseur" ADD CONSTRAINT "pde_excluded_by_annonceur_id_fkey" FOREIGN KEY ("excluded_by_annonceur_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."publisher_diffusion_exclusion_by_annonceur_for_diffuseur" ADD CONSTRAINT "pde_excluded_for_diffuseur_id_fkey" FOREIGN KEY ("excluded_for_diffuseur_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."StatEvent_es_id_key" RENAME TO "stat_event_es_id_key";
