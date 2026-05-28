/**
 * One-shot : convertit chaque PublisherDiffusionExclusion en rule(s).
 *
 * Modèle cible (shared-root) :
 *   pour chaque (annonceur A, diffuseur D), une seule rule racine
 *     { publisher_id=D, field='publisherId', value=A, combined_with_id=NULL }
 *   puis une rule enfant par publisherOrganization exclue
 *     { publisher_id=D, field='publisherOrganizationId', value=PO.id, combined_with_id=root.id }
 *
 * PO.id est résolu via publisher_organization quand publisherOrganizationId est renseigné,
 * sinon via la jointure (excluded_by_annonceur_id, organization_client_id).
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
  po_id: string;
};

const listCandidates = async (): Promise<CandidateRow[]> =>
  prisma.$queryRaw<CandidateRow[]>`
    SELECT DISTINCT
      pde."excluded_for_diffuseur_id" AS "diffuseur_id",
      pde."excluded_by_annonceur_id"  AS "annonceur_id",
      COALESCE(po."id", po_fallback."id") AS "po_id"
    FROM "public"."publisher_diffusion_exclusion" pde
    LEFT JOIN "public"."publisher_organization" po
      ON po."id" = pde."publisher_organization_id"
    LEFT JOIN "public"."publisher_organization" po_fallback
      ON po_fallback."publisher_id" = pde."excluded_by_annonceur_id"
     AND po_fallback."client_id" = pde."organization_client_id"
    WHERE COALESCE(po."id", po_fallback."id") IS NOT NULL
  `;

const groupCandidates = (candidates: CandidateRow[]) => {
  const groups = new Map<string, { diffuseurId: string; annonceurId: string; poIds: Set<string> }>();
  for (const candidate of candidates) {
    const key = `${candidate.diffuseur_id}::${candidate.annonceur_id}`;
    const group = groups.get(key) ?? { diffuseurId: candidate.diffuseur_id, annonceurId: candidate.annonceur_id, poIds: new Set<string>() };
    group.poIds.add(candidate.po_id);
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

const ensureChild = async (rootId: string, diffuseurId: string, poId: string): Promise<boolean> => {
  const existing = await prisma.publisherDiffusionRule.findFirst({
    where: { publisherId: diffuseurId, field: "publisherOrganizationId", value: poId },
    select: { id: true },
  });
  if (existing) {
    return false;
  }

  await prisma.publisherDiffusionRule.create({
    data: {
      publisher: { connect: { id: diffuseurId } },
      combinedWith: { connect: { id: rootId } },
      field: "publisherOrganizationId",
      fieldType: "string",
      operator: "is_not",
      value: poId,
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
    console.log(group);
    if (isDryRun) {
      console.log(`  - diffuseur=${group.diffuseurId} annonceur=${group.annonceurId} po_count=${group.poIds.size}`);
      continue;
    }

    const rootId = await ensureScopeRoot(group.diffuseurId, group.annonceurId);
    createdRoots += 1;

    console.log(`  - rootId=${rootId}`);

    for (const poId of group.poIds) {
      const created = await ensureChild(rootId, group.diffuseurId, poId);
      console.log(`  - poId=${poId} created=${created}`);
      if (created) {
        createdChildren += 1;
      } else {
        skippedChildren += 1;
      }
    }
    break;
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
