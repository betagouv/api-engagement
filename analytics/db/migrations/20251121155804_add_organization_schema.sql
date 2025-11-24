-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."organization" (
  "id" TEXT PRIMARY KEY,
  "gestion" TEXT,
  "status" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_declared_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "dissolved_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nature" TEXT,
  "groupement" TEXT,
  "title" TEXT NOT NULL,
  "short_title" TEXT,
  "names" TEXT[] NOT NULL,
  "address_insee_code" TEXT,
  "address_postal_code" TEXT,
  "address_department_code" TEXT,
  "address_department_name" TEXT,
  "address_region" TEXT,
  "address_city" TEXT,
  "management_postal_code" TEXT,
  "management_city" TEXT,
  "management_country" TEXT,
  "director_civility" TEXT,
  "source" TEXT
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."organization";
