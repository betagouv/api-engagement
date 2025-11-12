-- migrate:up
DO $$ BEGIN
  CREATE TYPE "analytics_raw"."moderation_event_status" AS ENUM ('ACCEPTED', 'REFUSED', 'PENDING', 'ONGOING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "analytics_raw"."moderation_event" (
  "id" TEXT NOT NULL,
  "mission_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "moderator_id" TEXT,
  "user_name" TEXT,
  "initial_status" "analytics_raw"."moderation_event_status",
  "new_status" "analytics_raw"."moderation_event_status",
  "initial_comment" TEXT,
  "new_comment" TEXT,
  "initial_note" TEXT,
  "new_note" TEXT,
  "initial_title" TEXT,
  "new_title" TEXT,
  "initial_siren" TEXT,
  "new_siren" TEXT,
  "initial_rna" TEXT,
  "new_rna" TEXT,

  CONSTRAINT "moderation_event_pkey" PRIMARY KEY ("id")
);

-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."moderation_event";
DROP TYPE IF EXISTS "analytics_raw"."moderation_event_status";

