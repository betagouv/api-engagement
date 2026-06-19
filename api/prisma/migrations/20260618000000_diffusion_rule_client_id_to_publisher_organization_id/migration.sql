-- Migration de données : convertit les diffusion rules portant sur `publisherOrganization.clientId`
-- vers `publisherOrganizationId`. La valeur (clientId) est résolue vers l'id de l'organisation de
-- l'annonceur. L'annonceur est identifié par la règle racine parente (`combined_with_id`),
-- dont `value` est le publisher_id de l'annonceur, et l'organisation est unique par
-- (publisher_id, client_id).
UPDATE "publisher_diffusion_rule" AS "rule"
SET "field" = 'publisherOrganizationId',
    "value" = "org"."id"
FROM "publisher_diffusion_rule" AS "root"
JOIN "publisher_organization" AS "org"
  ON "org"."publisher_id" = "root"."value"
WHERE "rule"."field" = 'publisherOrganization.clientId'
  AND "root"."id" = "rule"."combined_with_id"
  AND "org"."client_id" = "rule"."value";
