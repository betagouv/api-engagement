CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- DropIndex
DROP INDEX "public"."organization_rna_idx";

-- DropIndex
DROP INDEX "public"."organization_siren_idx";

-- DropIndex
DROP INDEX "public"."organization_title_idx";

-- CreateIndex
CREATE INDEX "organization_rna_idx" ON "public"."organization" USING GIN ("rna" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "organization_title_idx" ON "public"."organization" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "organization_short_title_idx" ON "public"."organization" USING GIN ("short_title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "organization_object_idx" ON "public"."organization" USING GIN ("object" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "organization_siret_idx" ON "public"."organization" USING GIN ("siret" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "organization_siren_idx" ON "public"."organization" USING GIN ("siren" gin_trgm_ops);
