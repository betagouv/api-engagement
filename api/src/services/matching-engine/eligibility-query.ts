import { Prisma } from "@/db/core";
import { CURRENT_PROMPT_VERSION } from "@/services/mission-enrichment/prompts";
import { GATE_TAXONOMIES } from "@engagement/taxonomy";

const buildGateTaxonomiesSql = () => Prisma.join(GATE_TAXONOMIES.map((taxonomy) => Prisma.sql`${taxonomy}`));

type EligibilityParams = {
  userScoringId: string;
  publisherDiffusionJoinSql?: Prisma.Sql;
};

export const buildEligibilityCtes = (params: EligibilityParams): Prisma.Sql => {
  return Prisma.sql`
  active_mission_scorings AS (
    SELECT mc."mission_scoring_id", mc."mission_id", m."remote"::text AS "remote"
    FROM "matching_mission_catalog" mc
    JOIN "mission" m ON m."id" = mc."mission_id"
    ${params.publisherDiffusionJoinSql ?? Prisma.empty}
    WHERE mc."prompt_version" = ${CURRENT_PROMPT_VERSION}
      AND mc."enrichment_status" = 'completed'
      AND m."deleted_at" IS NULL
      AND m."status_code" = 'ACCEPTED'
  ),
  user_gate_values AS MATERIALIZED (
    SELECT DISTINCT usv."taxonomy_key", usv."value_key"
    FROM "user_scoring_value" usv
    WHERE usv."user_scoring_id" = ${params.userScoringId}
      AND usv."taxonomy_key" IN (${buildGateTaxonomiesSql()})
  ),
  eligible_mission_scorings AS MATERIALIZED (
    SELECT ams."mission_id", ams."mission_scoring_id", ams."remote"
    FROM active_mission_scorings ams
    WHERE NOT EXISTS (
      SELECT 1 FROM "matching_mission_gate" mg
      WHERE mg."mission_scoring_id" = ams."mission_scoring_id"
        AND mg."taxonomy_key" IN (${buildGateTaxonomiesSql()})
        AND NOT EXISTS (
          SELECT 1 FROM user_gate_values ugv
          WHERE ugv."taxonomy_key" = mg."taxonomy_key"
            AND ugv."value_key" = ANY(mg."allowed_values")
        )
    )
  )`;
};
