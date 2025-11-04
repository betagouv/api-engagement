-- migrate:up
DO $$ BEGIN
  CREATE TYPE "public"."SourceType" AS ENUM ('api', 'widget', 'campaign', 'seo', 'jstag', 'publisher');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- migrate:down
DROP TYPE IF EXISTS "public"."SourceType";
