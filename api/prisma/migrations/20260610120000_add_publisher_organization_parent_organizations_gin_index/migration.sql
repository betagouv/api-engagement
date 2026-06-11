-- CreateIndex
CREATE INDEX "publisher_organization_parent_organizations_idx" ON "public"."publisher_organization" USING GIN ("parent_organizations");
