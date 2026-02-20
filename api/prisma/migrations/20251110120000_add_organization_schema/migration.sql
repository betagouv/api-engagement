-- CreateTable
CREATE TABLE "public"."organization" (
    "id" TEXT NOT NULL,
    "rna" TEXT,
    "siren" TEXT,
    "siret" TEXT,
    "sirets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rup_mi" TEXT,
    "gestion" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_declared_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "dissolved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nature" TEXT,
    "groupement" TEXT,
    "title" TEXT NOT NULL,
    "names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "short_title" TEXT,
    "title_slug" TEXT,
    "short_title_slug" TEXT,
    "object" TEXT,
    "social_object1" TEXT,
    "social_object2" TEXT,
    "address_complement" TEXT,
    "address_number" TEXT,
    "address_repetition" TEXT,
    "address_type" TEXT,
    "address_street" TEXT,
    "address_distribution" TEXT,
    "address_insee_code" TEXT,
    "address_postal_code" TEXT,
    "address_department_code" TEXT,
    "address_department_name" TEXT,
    "address_region" TEXT,
    "address_city" TEXT,
    "management_declarant" TEXT,
    "management_complement" TEXT,
    "management_street" TEXT,
    "management_distribution" TEXT,
    "management_postal_code" TEXT,
    "management_city" TEXT,
    "management_country" TEXT,
    "director_civility" TEXT,
    "website" TEXT,
    "observation" TEXT,
    "sync_at" TIMESTAMP(3),
    "source" TEXT,
    "is_rup" BOOLEAN NOT NULL DEFAULT false,
    "letudiant_public_id" TEXT,
    "letudiant_updated_at" TIMESTAMP(3),
    "last_exported_to_pg_at" TIMESTAMP(3),

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_rna_key" ON "public"."organization"("rna");

-- CreateIndex
CREATE INDEX "organization_updated_last_exported_idx" ON "public"."organization"("updated_at", "last_exported_to_pg_at");

-- CreateIndex
CREATE INDEX "organization_rna_idx" ON "public"."organization"("rna");

-- CreateIndex
CREATE INDEX "organization_title_idx" ON "public"."organization"("title");

-- CreateIndex
CREATE INDEX "organization_title_slug_idx" ON "public"."organization"("title_slug");

-- CreateIndex
CREATE INDEX "organization_sirets_idx" ON "public"."organization" USING GIN ("sirets");

-- CreateIndex
CREATE INDEX "organization_siren_idx" ON "public"."organization"("siren");

-- CreateIndex
CREATE INDEX "organization_names_idx" ON "public"."organization" USING GIN ("names");

-- CreateIndex
CREATE INDEX "organization_department_name_idx" ON "public"."organization"("address_department_name");

-- CreateIndex
CREATE INDEX "organization_city_idx" ON "public"."organization"("address_city");
