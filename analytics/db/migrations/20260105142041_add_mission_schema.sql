-- migrate:up
CREATE TABLE IF NOT EXISTS "analytics_raw"."mission" (
  "id" TEXT PRIMARY KEY,
  "client_id" TEXT NOT NULL,
  "domain_id" TEXT,
  "activity_id" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "tasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "soft_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rome_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "reduced_mobility_accessible" BOOLEAN,
  "close_to_transport" BOOLEAN,
  "open_to_minors" BOOLEAN,
  "remote" TEXT,
  "schedule" TEXT,
  "duration" INTEGER,
  "posted_at" TIMESTAMP(3),
  "start_at" TIMESTAMP(3),
  "end_at" TIMESTAMP(3),
  "priority" TEXT,
  "places" INTEGER,
  "places_status" TEXT,
  "domain_original" TEXT,
  "type" TEXT,
  "status_code" TEXT,
  "organization_id" TEXT,
  "publisher_id" TEXT NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "analytics_raw"."domain" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "analytics_raw"."activity" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."mission";
DROP TABLE IF EXISTS "analytics_raw"."domain";
DROP TABLE IF EXISTS "analytics_raw"."activity";
