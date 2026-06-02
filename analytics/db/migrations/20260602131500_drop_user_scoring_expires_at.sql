-- migrate:up
ALTER TABLE "analytics_raw"."user_scoring"
DROP COLUMN IF EXISTS "expires_at" CASCADE;


-- migrate:down
ALTER TABLE "analytics_raw"."user_scoring"
ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
