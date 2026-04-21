-- CreateIndex
CREATE INDEX "organization_search_text_fts_idx"
ON "public"."organization"
USING GIN (to_tsvector('simple', COALESCE("search_text", '')));
