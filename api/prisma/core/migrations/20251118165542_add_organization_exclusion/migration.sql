-- CreateTable
CREATE TABLE "public"."organization_exclusion" (
    "id" TEXT NOT NULL,
    "excluded_by_annonceur_id" TEXT NOT NULL,
    "excluded_for_diffuseur_id" TEXT NOT NULL,
    "organization_client_id" TEXT,
    "organization_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_exclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_exclusion_excluded_for_diffuseur_id_idx" ON "public"."organization_exclusion"("excluded_for_diffuseur_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_exclusion_unique_key" ON "public"."organization_exclusion"("excluded_by_annonceur_id", "excluded_for_diffuseur_id", "organization_client_id");

-- AddForeignKey
ALTER TABLE "public"."organization_exclusion" ADD CONSTRAINT "organization_exclusion_excluded_by_annonceur_id_fkey" FOREIGN KEY ("excluded_by_annonceur_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_exclusion" ADD CONSTRAINT "organization_exclusion_excluded_for_diffuseur_id_fkey" FOREIGN KEY ("excluded_for_diffuseur_id") REFERENCES "public"."publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
