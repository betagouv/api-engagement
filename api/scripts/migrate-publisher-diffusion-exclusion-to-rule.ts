/**
 * One-shot : convertit chaque PublisherDiffusionExclusion en rule(s).
 *
 * Modèle cible (shared-root) :
 *   pour chaque (annonceur A, diffuseur D), une seule rule racine
 *     { publisher_id=D, field='publisherId', value=A, combined_with_id=NULL }
 *   puis une rule enfant par organization exclue
 *     { publisher_id=D, field='publisherOrganization.clientId', value=clientId, combined_with_id=root.id }
 *
 * Le clientId est résolu via publisher_organization quand publisherOrganizationId est
 * renseigné sur l'exclusion, sinon directement via pde.organization_client_id.
 *
 * Idempotent : on n'insère pas si la rule (publisher_id, field, value) existe déjà
 * (unique key).
 *
 * À exécuter après la migration qui ajoute combined_with_id (et avant tout drop futur
 * de publisher_diffusion_exclusion) :
 *   npx ts-node scripts/migrate-publisher-diffusion-exclusion-to-rule.ts --dry-run
 *   npx ts-node scripts/migrate-publisher-diffusion-exclusion-to-rule.ts
 */
import dotenv from "dotenv";

dotenv.config();

import { prisma } from "../src/db/postgres";

const isDryRun = process.argv.includes("--dry-run");

type CandidateRow = {
  diffuseur_id: string;
  annonceur_id: string;
  client_id: string;
};

const listCandidates = async (): Promise<CandidateRow[]> =>
  prisma.$queryRaw<CandidateRow[]>`
    SELECT DISTINCT
      pde."excluded_for_diffuseur_id" AS "diffuseur_id",
      pde."excluded_by_annonceur_id"  AS "annonceur_id",
      COALESCE(po."client_id", pde."organization_client_id") AS "client_id"
    FROM "public"."publisher_diffusion_exclusion" pde
    LEFT JOIN "public"."publisher_organization" po
      ON po."id" = pde."publisher_organization_id"
    WHERE COALESCE(po."client_id", pde."organization_client_id") IS NOT NULL
  `;

const groupCandidates = (candidates: CandidateRow[]) => {
  const groups = new Map<string, { diffuseurId: string; annonceurId: string; clientIds: Set<string> }>();
  for (const candidate of candidates) {
    const key = `${candidate.diffuseur_id}::${candidate.annonceur_id}`;
    const group = groups.get(key) ?? { diffuseurId: candidate.diffuseur_id, annonceurId: candidate.annonceur_id, clientIds: new Set<string>() };
    group.clientIds.add(candidate.client_id);
    groups.set(key, group);
  }
  return Array.from(groups.values());
};

const ensureScopeRoot = async (diffuseurId: string, annonceurId: string): Promise<string> => {
  const existing = await prisma.publisherDiffusionRule.findFirst({
    where: { publisherId: diffuseurId, combinedWithId: null, field: "publisherId", value: annonceurId },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  const created = await prisma.publisherDiffusionRule.create({
    data: {
      publisher: { connect: { id: diffuseurId } },
      field: "publisherId",
      fieldType: "string",
      operator: "is",
      value: annonceurId,
      combinator: "or",
      position: 0,
    },
    select: { id: true },
  });
  return created.id;
};

const ensureChild = async (rootId: string, diffuseurId: string, clientId: string): Promise<boolean> => {
  const existing = await prisma.publisherDiffusionRule.findFirst({
    where: { publisherId: diffuseurId, field: "publisherOrganization.clientId", value: clientId },
    select: { id: true },
  });
  if (existing) {
    return false;
  }

  await prisma.publisherDiffusionRule.create({
    data: {
      publisher: { connect: { id: diffuseurId } },
      combinedWith: { connect: { id: rootId } },
      field: "publisherOrganization.clientId",
      fieldType: "string",
      operator: "is_not",
      value: clientId,
      combinator: "and",
      position: 0,
    },
  });
  return true;
};

const run = async () => {
  const startedAt = new Date();
  console.log(`[PublisherDiffusionExclusionToRule] Démarré à ${startedAt.toISOString()}${isDryRun ? " (dry-run)" : ""}.`);

  await prisma.$connect();

  const candidates = await listCandidates();
  const groups = groupCandidates(candidates);
  console.log(`[PublisherDiffusionExclusionToRule] ${groups.length} groupes (diffuseur, annonceur) à traiter, ${candidates.length} exclusions au total.`);

  let createdRoots = 0;
  let createdChildren = 0;
  let skippedChildren = 0;

  for (const group of groups) {
    if (isDryRun) {
      console.log(`  - diffuseur=${group.diffuseurId} annonceur=${group.annonceurId} client_count=${group.clientIds.size}`);
      continue;
    }

    const rootId = await ensureScopeRoot(group.diffuseurId, group.annonceurId);
    createdRoots += 1;

    for (const clientId of group.clientIds) {
      const created = await ensureChild(rootId, group.diffuseurId, clientId);

      if (created) {
        createdChildren += 1;
      } else {
        skippedChildren += 1;
      }
    }
  }

  const durationMs = Date.now() - startedAt.getTime();
  console.log(
    `[PublisherDiffusionExclusionToRule] Racines traitées=${createdRoots}, enfants créés=${createdChildren}, enfants ignorés=${skippedChildren}, durée=${(durationMs / 1000).toFixed(1)}s.`
  );
};

const shutdown = async (exitCode: number) => {
  await prisma.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[PublisherDiffusionExclusionToRule] Échec:", error);
    await shutdown(1);
  });
