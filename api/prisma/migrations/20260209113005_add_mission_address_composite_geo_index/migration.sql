-- CreateIndex (à lancer manuellement en prod avec CREATE INDEX CONCURRENTLY)
CREATE INDEX IF NOT EXISTS "mission_address_mission_lat_lon_idx" ON "mission_address"("mission_id", "location_lat", "location_lon");
