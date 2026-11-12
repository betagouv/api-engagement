-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."publisher_demarche_simplifiees" (
  "id" TEXT PRIMARY KEY,
  "publisher_id" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."publisher_demarche_simplifiees";
