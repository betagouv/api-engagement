-- AlterTable: add geoloc_failure_count column
ALTER TABLE "mission_address" ADD COLUMN "geoloc_failure_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: index on geoloc_status for job query performance
CREATE INDEX "mission_address_geoloc_status_idx" ON "mission_address"("geoloc_status");
