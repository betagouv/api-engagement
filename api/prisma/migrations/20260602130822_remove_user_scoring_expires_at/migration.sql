-- Remove the user_scoring expiration date: scorings no longer expire.
DROP INDEX IF EXISTS "user_scoring_expires_at_idx";

ALTER TABLE "user_scoring" DROP COLUMN IF EXISTS "expires_at";
