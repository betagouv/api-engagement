-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."publisher" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "category" TEXT,
  "is_annonceur" BOOLEAN NOT NULL DEFAULT FALSE,
  "has_api_rights" BOOLEAN NOT NULL DEFAULT FALSE,
  "has_widget_rights" BOOLEAN NOT NULL DEFAULT FALSE,
  "has_campaign_rights" BOOLEAN NOT NULL DEFAULT FALSE,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."publisher";
