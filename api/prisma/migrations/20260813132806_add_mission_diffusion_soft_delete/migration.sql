-- AlterTable
ALTER TABLE "mission_diffusion"
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "id" TEXT;

-- La colonne est ajoutée nullable pour permettre le backfill des lignes existantes.
UPDATE "mission_diffusion"
SET "id" = gen_random_uuid()::text
WHERE "id" IS NULL;

ALTER TABLE "mission_diffusion" ALTER COLUMN "id" SET NOT NULL;

-- L'identifiant technique permet de conserver un cycle de diffusion à chaque réactivation.
ALTER TABLE "mission_diffusion" DROP CONSTRAINT "mission_diffusion_pkey";

ALTER TABLE "mission_diffusion"
ADD CONSTRAINT "mission_diffusion_pkey" PRIMARY KEY ("id");

-- Une seule période active est autorisée pour un couple mission / diffuseur. Les périodes
-- clôturées restent présentes afin de conserver l'historique des retraits et réactivations.
CREATE UNIQUE INDEX "mission_diffusion_distribution_publisher_mission_active_key"
ON "mission_diffusion" ("distribution_publisher_id", "mission_id")
WHERE "deleted_at" IS NULL;
