-- migrate:up
ALTER TABLE "analytics_raw"."warning" RENAME COLUMN "fixed_at" TO "resolved_at";

-- migrate:down
ALTER TABLE "analytics_raw"."warning" RENAME COLUMN "resolved_at" TO "fixed_at";
