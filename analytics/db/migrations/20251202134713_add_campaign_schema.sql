
-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."campaign" (
  "id" TEXT PRIMARY KEY,
  "url" TEXT,
  "name" TEXT,
  "from_publisher_id" TEXT NOT NULL,
  "to_publisher_id" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reassigned_at" TIMESTAMP(3),
  "reassigned_by_user_id" TEXT,
  "type" TEXT
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."campaign_tracker" (
  "id" TEXT PRIMARY KEY,
  "campaign_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."campaign_tracker";
DROP TABLE IF EXISTS "analytics_raw"."campaign";
