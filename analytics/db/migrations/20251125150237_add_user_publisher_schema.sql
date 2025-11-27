-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."user_publisher" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "publisher_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."user_publisher";
