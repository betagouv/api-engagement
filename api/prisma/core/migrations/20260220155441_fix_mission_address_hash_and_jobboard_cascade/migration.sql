-- Fix mission address UUID instability causing phantom jobs on L'Etudiant (Piloty)
-- Part 1/2 : Add address_hash column only.
--
-- Run script scripts/backfill-mission-address-hash.ts before applying Part 2/2
-- (20260303120000_mission_address_hash_index_and_jobboard_fk).

ALTER TABLE "public"."mission_address"
  ADD COLUMN "address_hash" TEXT NOT NULL DEFAULT '';
