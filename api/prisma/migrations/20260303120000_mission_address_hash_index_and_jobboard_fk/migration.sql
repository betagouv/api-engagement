-- Fix mission address UUID instability - Part 2/2 : unique index + FK cascade fix.
--
-- Prérequis : le script backfill-mission-address-hash.ts doit avoir tourné à son terme
-- sur la base cible avant d'appliquer cette migration.

-- Déduplication : redirige les FK mission_jobboard vers l'adresse conservée,
-- puis supprime les doublons (même mission_id + address_hash).
-- Conserve la ligne la plus ancienne par groupe (created_at ASC, id ASC).
WITH keepers AS (
  SELECT DISTINCT ON (mission_id, address_hash)
    id AS keep_id,
    mission_id,
    address_hash
  FROM "public"."mission_address"
  ORDER BY mission_id, address_hash, created_at ASC, id ASC
)
UPDATE "public"."mission_jobboard" mjb
SET "mission_address_id" = k.keep_id
FROM "public"."mission_address" ma
JOIN keepers k ON k.mission_id = ma.mission_id AND k.address_hash = ma.address_hash
WHERE mjb."mission_address_id" = ma.id
  AND ma.id != k.keep_id;

DELETE FROM "public"."mission_address"
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY mission_id, address_hash ORDER BY created_at ASC, id ASC) AS rn
    FROM "public"."mission_address"
  ) ranked
  WHERE rn > 1
);

-- Supprime le DEFAULT '' maintenant que toutes les lignes sont remplies.
ALTER TABLE "public"."mission_address" ALTER COLUMN "address_hash" DROP DEFAULT;

-- Crée l'index unique : rapide car les données sont déjà peuplées (pas d'UPDATE concurrent).
CREATE UNIQUE INDEX "mission_address_hash_unique"
  ON "public"."mission_address"("mission_id", "address_hash");

-- Change la FK mission_jobboard : CASCADE → SET NULL pour préserver les enregistrements
-- de synchronisation jobboard lors des réimports d'adresses.
ALTER TABLE "public"."mission_jobboard"
  DROP CONSTRAINT IF EXISTS "mission_jobboard_mission_address_id_fkey";

ALTER TABLE "public"."mission_jobboard"
  ADD CONSTRAINT "mission_jobboard_mission_address_id_fkey"
  FOREIGN KEY ("mission_address_id")
  REFERENCES "public"."mission_address"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
