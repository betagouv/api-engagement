-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_diffusion" (
  "distribution_publisher_id" TEXT NOT NULL,
  "mission_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("distribution_publisher_id", "mission_id")
);


-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."mission_diffusion";
