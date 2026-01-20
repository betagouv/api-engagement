-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."widget" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#000091',
  "style" TEXT NOT NULL DEFAULT 'page',
  "type" TEXT NOT NULL DEFAULT 'benevolat',
  "location_lat" DOUBLE PRECISION,
  "location_long" DOUBLE PRECISION,
  "location_city" TEXT,
  "distance" TEXT NOT NULL DEFAULT '25km',
  "url" TEXT,
  "jva_moderation" BOOLEAN NOT NULL DEFAULT FALSE,
  "from_publisher_id" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."widget_publisher" (
  "widget_id" TEXT NOT NULL,
  "publisher_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("widget_id", "publisher_id")
);

CREATE TABLE IF NOT EXISTS "analytics_raw"."widget_rule" (
  "id" TEXT PRIMARY KEY,
  "widget_id" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "field_type" TEXT,
  "operator" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "combinator" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."widget_rule";
DROP TABLE IF EXISTS "analytics_raw"."widget_publisher";
DROP TABLE IF EXISTS "analytics_raw"."widget";
