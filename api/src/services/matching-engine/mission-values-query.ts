import { Prisma } from "@/db/core";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";

/** Valeurs publiées du prompt courant pour les scores, dispositifs et détails. */
export const buildMissionValuesSource = (): Prisma.Sql => Prisma.sql`(
  SELECT "mission_scoring_id", "taxonomy_key", "value_key", "score"
  FROM "matching_mission_value"
  WHERE "prompt_version" = ${CURRENT_PROMPT_VERSION}
)`;
