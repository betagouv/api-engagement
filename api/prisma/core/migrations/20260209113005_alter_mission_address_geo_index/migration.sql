CREATE INDEX IF NOT EXISTS "mission_address_lat_lon_mission_idx" ON "mission_address"("location_lat", "location_lon", "mission_id");
DROP INDEX IF EXISTS "mission_address_mission_lat_long_idx"