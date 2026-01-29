-- Backfill geo_point from lat/lon for existing records
UPDATE "mission_address"
SET "geo_point" = point("location_lon", "location_lat")
WHERE "location_lat" IS NOT NULL
  AND "location_lon" IS NOT NULL
  AND "geo_point" IS NULL;

-- Create GiST index for efficient bounding box queries
-- Note: CONCURRENTLY cannot be used inside a transaction, so we use regular CREATE INDEX
-- For production with large tables, consider running this migration manually with CONCURRENTLY
CREATE INDEX "mission_address_geo_point_gist_idx"
ON "mission_address" USING gist ("geo_point");

-- Create trigger function to keep geo_point synchronized with lat/lon
CREATE OR REPLACE FUNCTION update_geo_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_lat IS NOT NULL AND NEW.location_lon IS NOT NULL THEN
    NEW.geo_point = point(NEW.location_lon, NEW.location_lat);
  ELSE
    NEW.geo_point = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geo_point on insert/update
CREATE TRIGGER mission_address_geo_point_trigger
BEFORE INSERT OR UPDATE OF location_lat, location_lon
ON mission_address
FOR EACH ROW
EXECUTE FUNCTION update_geo_point();
