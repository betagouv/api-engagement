-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."mission_address" (
  "id" TEXT PRIMARY KEY,
  "mission_id" TEXT NOT NULL,
  "street" TEXT,
  "postal_code" TEXT,
  "department_name" TEXT,
  "department_code" TEXT,
  "city" TEXT,
  "region" TEXT,
  "country" TEXT,
  "location_lat" DOUBLE PRECISION,
  "location_lon" DOUBLE PRECISION,
  "geo_point" point,
  "geoloc_status" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."mission_address";
