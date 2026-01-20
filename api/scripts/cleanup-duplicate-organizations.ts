/**
 * Nettoyage des organisations en doublon sans mission rattachee.
 *
 * Execution:
 *   npx ts-node scripts/cleanup-duplicate-organizations.ts [--dry-run]
 *
 * Par defaut, le script supprime. Utiliser --dry-run pour simuler.
 */
import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "../src/db/core";
import { prismaCore } from "../src/db/postgres";

type OrganizationRow = {
  id: string;
  title: string;
  created_at: Date;
  title_key: string;
  mission_count: number;
};

const parseFlagValue = (flag: string): string | null => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
};

const dryRun = process.argv.includes("--dry-run");
const titleFilter = parseFlagValue("--title");

const run = async () => {
  const startedAt = new Date();
  console.log(`[OrganizationCleanup] Started at ${startedAt.toISOString()}`);
  console.log(`[OrganizationCleanup] Mode: ${dryRun ? "dry-run" : "execute"}`);

  await prismaCore.$connect();

  const rows = await prismaCore.$queryRaw<OrganizationRow[]>(
    Prisma.sql`
      WITH duplicates AS (
        SELECT LOWER(TRIM(o."title")) AS title_key
        FROM "organization" o
        GROUP BY LOWER(TRIM(o."title"))
        HAVING COUNT(*) > 1
      ),
      orgs AS (
        SELECT
          o."id",
          o."title",
          o."created_at",
          LOWER(TRIM(o."title")) AS title_key
        FROM "organization" o
        INNER JOIN duplicates d ON d.title_key = LOWER(TRIM(o."title"))
        ${titleFilter ? Prisma.sql`WHERE LOWER(TRIM(o."title")) = LOWER(TRIM(${titleFilter}))` : Prisma.empty}
      ),
      mission_counts AS (
        SELECT
          m."organization_id" AS org_id,
          COUNT(*)::int AS mission_count
        FROM "mission" m
        WHERE m."organization_id" IS NOT NULL
        GROUP BY m."organization_id"
      )
      SELECT
        o."id",
        o."title",
        o."created_at",
        o.title_key,
        COALESCE(mc.mission_count, 0) AS mission_count
      FROM orgs o
      LEFT JOIN mission_counts mc ON mc.org_id = o."id"
      ORDER BY o.title_key, o."created_at" ASC
    `
  );

  if (!rows.length) {
    console.log("[OrganizationCleanup] Aucun doublon detecte.");
    return;
  }

  const byTitle = new Map<string, OrganizationRow[]>();
  for (const row of rows) {
    const list = byTitle.get(row.title_key) ?? [];
    list.push(row);
    byTitle.set(row.title_key, list);
  }

  const idsToDelete = new Set<string>();
  let groupsWithDeletes = 0;

  for (const [titleKey, orgs] of byTitle.entries()) {
    const withMissions = orgs.filter((row) => row.mission_count > 0);
    const withoutMissions = orgs.filter((row) => row.mission_count === 0);

    if (!withoutMissions.length) {
      continue;
    }

    if (withMissions.length > 0) {
      for (const org of withoutMissions) {
        idsToDelete.add(org.id);
      }
      groupsWithDeletes++;
      continue;
    }

    const sorted = [...withoutMissions].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    const [, ...duplicates] = sorted;
    for (const org of duplicates) {
      idsToDelete.add(org.id);
    }
    if (duplicates.length > 0) {
      groupsWithDeletes++;
    }
  }

  const ids = Array.from(idsToDelete);
  console.log(
    `[OrganizationCleanup] Doublons trouves: ${byTitle.size}, groupes avec suppressions: ${groupsWithDeletes}, organisations a supprimer: ${ids.length}`
  );

  if (!ids.length) {
    console.log("[OrganizationCleanup] Rien a supprimer.");
    return;
  }

  const groupsToDelete = Array.from(byTitle.entries())
    .map(([titleKey, orgs]) => {
      const deletions = orgs.filter((row) => idsToDelete.has(row.id));
      return { titleKey, deletions };
    })
    .filter((group) => group.deletions.length > 0);

  console.log("[OrganizationCleanup] Liste des groupes a supprimer:");
  for (const group of groupsToDelete) {
    console.log(`- ${group.titleKey} (${group.deletions.length})`);
  }

  if (dryRun) {
    console.log("[OrganizationCleanup] Dry-run uniquement. Relancer sans --dry-run pour supprimer.");
    return;
  }

  const chunkSize = 500;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const result = await prismaCore.organization.deleteMany({
      where: { id: { in: chunk } },
    });
    deleted += result.count;
  }

  console.log(`[OrganizationCleanup] Suppression terminee (${deleted} lignes).`);
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[OrganizationCleanup] Failed:", error);
    await shutdown(1);
  });
