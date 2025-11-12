-- migrate:up
DO $$ BEGIN
  CREATE TYPE "analytics_raw"."EmailStatus" AS ENUM ('PENDING', 'PROCESSED', 'DUPLICATE', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "analytics_raw"."email" (
  "id" TEXT PRIMARY KEY,
  "message_id" TEXT,
  "in_reply_to" TEXT,
  "from_name" TEXT,
  "from_email" TEXT,
  "subject" TEXT,
  "sent_at" TIMESTAMP(3),
  "status" "analytics_raw"."EmailStatus" NOT NULL DEFAULT 'PENDING',
  "date_from" TIMESTAMP(3),
  "date_to" TIMESTAMP(3),
  "created_count" INTEGER,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- migrate:down
DROP TABLE IF EXISTS "analytics_raw"."email";
DROP TYPE IF EXISTS "analytics_raw"."EmailStatus";
