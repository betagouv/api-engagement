-- migrate:up
-- CreateEnum
CREATE TYPE "public"."StatEventType" AS ENUM ('click', 'print', 'apply', 'account');

-- CreateEnum
CREATE TYPE "public"."StatSource" AS ENUM ('api', 'widget', 'campaign', 'seo', 'jstag', 'publisher');

-- CreateEnum
CREATE TYPE "public"."StatEventStatus" AS ENUM ('PENDING', 'VALIDATED', 'CANCEL', 'CANCELED', 'REFUSED', 'CARRIED_OUT');

-- CreateTable
CREATE TABLE "public"."StatEvent" (
    "id" TEXT NOT NULL,
    "type" "public"."StatEventType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "click_id" TEXT,
    "referer" TEXT,
    "host" TEXT,
    "is_bot" BOOLEAN NOT NULL DEFAULT FALSE,
    "is_human" BOOLEAN NOT NULL DEFAULT FALSE,
    "source" "public"."StatSource" NOT NULL,
    "source_id" TEXT NOT NULL,
    "from_publisher_id" TEXT NOT NULL,
    "to_publisher_id" TEXT NOT NULL,
    "mission_id" TEXT,
    "mission_client_id" TEXT,
    "tag" TEXT,
    "tags" TEXT[],
    "status" "public"."StatEventStatus",
    "custom_attributes" JSONB,

    CONSTRAINT "StatEvent_pkey" PRIMARY KEY ("id")
);

-- migrate:down

DROP TABLE IF EXISTS "public"."StatEvent";

DROP TYPE IF EXISTS "public"."StatEventStatus";
DROP TYPE IF EXISTS "public"."StatSource";
DROP TYPE IF EXISTS "public"."StatEventType";
