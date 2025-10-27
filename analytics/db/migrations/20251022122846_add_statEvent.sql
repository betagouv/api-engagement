-- migrate:up
CREATE TYPE "analytics_raw"."StatEventType" AS ENUM ('click', 'print', 'apply', 'account');
CREATE TYPE "analytics_raw"."StatSource" AS ENUM ('api', 'widget', 'campaign', 'seo', 'jstag', 'publisher');
CREATE TYPE "analytics_raw"."StatEventStatus" AS ENUM ('PENDING', 'VALIDATED', 'CANCEL', 'CANCELED', 'REFUSED', 'CARRIED_OUT');

CREATE TABLE IF NOT EXISTS "analytics_raw"."StatEvent" (
  "id" TEXT NOT NULL,
  "type" "analytics_raw"."StatEventType" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "click_id" TEXT,
  "referer" TEXT,
  "host" TEXT,
  "is_bot" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_human" BOOLEAN NOT NULL DEFAULT FALSE,
  "source" "analytics_raw"."StatSource" NOT NULL,
  "source_id" TEXT NOT NULL,
  "from_publisher_id" TEXT NOT NULL,
  "to_publisher_id" TEXT NOT NULL,
  "mission_id" TEXT,
  "mission_client_id" TEXT,
  "tag" TEXT,
  "tags" TEXT[],
  "status" "analytics_raw"."StatEventStatus",
  "custom_attributes" JSONB,

  CONSTRAINT "StatEvent_pkey" PRIMARY KEY ("id")
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."StatEvent";

DROP TYPE IF EXISTS "analytics_raw"."StatEventStatus";
DROP TYPE IF EXISTS "analytics_raw"."StatSource";
DROP TYPE IF EXISTS "analytics_raw"."StatEventType";
