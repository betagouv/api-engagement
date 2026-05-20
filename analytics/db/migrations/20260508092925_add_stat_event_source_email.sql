-- migrate:up
ALTER TYPE "analytics_raw"."StatSource" ADD VALUE IF NOT EXISTS 'email';
ALTER TYPE "public"."SourceType" ADD VALUE IF NOT EXISTS 'email';

-- migrate:down
-- PostgreSQL cannot safely remove an enum value without rebuilding the type.
