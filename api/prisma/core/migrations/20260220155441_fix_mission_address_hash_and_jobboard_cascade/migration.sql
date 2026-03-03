-- Fix mission address UUID instability causing phantom jobs on L'Etudiant (Piloty)
--
-- Problem: missionService.update() was doing deleteMany + createMany for addresses,
-- generating new UUIDs on every import. MissionJobBoard had onDelete: Cascade on
-- missionAddressId, so job board sync records were deleted on every import, causing
-- the L'Etudiant sync to call createJob instead of updateJob (phantom jobs).
--
-- Fix 1: Add address_hash column to mission_address for stable upsert by content.
-- Fix 2: Change MissionJobBoard FK to onDelete: SET NULL (preserve sync records).

-- Part 1: Add address_hash to mission_address
ALTER TABLE "public"."mission_address" ADD COLUMN "address_hash" TEXT NOT NULL DEFAULT '';

UPDATE "public"."mission_address"
SET "address_hash" = md5(
  COALESCE(street, '') || '|' ||
  COALESCE(city, '') || '|' ||
  COALESCE(postal_code, '') || '|' ||
  COALESCE(country, '') || '|' ||
  COALESCE(location_lat::TEXT, '') || '|' ||
  COALESCE(location_lon::TEXT, '')
);

ALTER TABLE "public"."mission_address" ALTER COLUMN "address_hash" DROP DEFAULT;

CREATE UNIQUE INDEX "mission_address_hash_unique"
  ON "public"."mission_address"("mission_id", "address_hash");

-- Part 2: Change MissionJobBoard FK from CASCADE to SET NULL
ALTER TABLE "public"."mission_jobboard"
  DROP CONSTRAINT IF EXISTS "mission_jobboard_mission_address_id_fkey";

ALTER TABLE "public"."mission_jobboard"
  ADD CONSTRAINT "mission_jobboard_mission_address_id_fkey"
  FOREIGN KEY ("mission_address_id")
  REFERENCES "public"."mission_address"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
