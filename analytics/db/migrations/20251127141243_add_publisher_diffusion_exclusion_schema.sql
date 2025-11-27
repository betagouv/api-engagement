-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."publisher_diffusion_exclusion" (
  "id" TEXT PRIMARY KEY,
  "excluded_by_annonceur_id" TEXT NOT NULL,
  "excluded_for_diffuseur_id" TEXT NOT NULL,
  "organization_client_id" TEXT,
  "organization_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."publisher_diffusion_exclusion";
