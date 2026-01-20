-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."user" (
  "id" TEXT PRIMARY KEY,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "last_activity_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."login_history" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "login_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."user";
DROP TABLE IF EXISTS "analytics_raw"."login_history";
