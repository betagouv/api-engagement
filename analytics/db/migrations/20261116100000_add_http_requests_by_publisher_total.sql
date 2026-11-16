-- migrate:up
CREATE TABLE "analytics_raw"."http_requests_by_publisher_total" (
  "date" DATE NOT NULL,
  "publisher_id" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "status_code" SMALLINT CHECK ("status_code" BETWEEN 100 AND 599),
  "request_count" BIGINT NOT NULL,
  "synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Deux index partiels pour dédupliquer aussi les statuts NULL (compatible PostgreSQL 13).
CREATE UNIQUE INDEX "http_requests_by_publisher_total_status_idx"
  ON "analytics_raw"."http_requests_by_publisher_total" ("date", "publisher_id", "route", "status_code")
  WHERE "status_code" IS NOT NULL;

CREATE UNIQUE INDEX "http_requests_by_publisher_total_no_status_idx"
  ON "analytics_raw"."http_requests_by_publisher_total" ("date", "publisher_id", "route")
  WHERE "status_code" IS NULL;

-- migrate:down
DROP TABLE "analytics_raw"."http_requests_by_publisher_total";
