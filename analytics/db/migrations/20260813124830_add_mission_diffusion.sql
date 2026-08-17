-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_diffusion" (
  "id" TEXT PRIMARY KEY,
  "distribution_publisher_id" TEXT NOT NULL,
  "mission_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);


-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."mission_diffusion";
