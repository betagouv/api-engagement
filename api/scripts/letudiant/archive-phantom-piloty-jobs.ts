/**
 * archive-phantom-piloty-jobs
 *
 * Archivage des missions fantômes sur Piloty (L'Étudiant).
 *
 * ## Contexte
 *
 * Quand `createJob` est appelé sur Piloty pour une mission dont le titre existe déjà,
 * Piloty génère un suffixe numérique sur le public_id (`slug-2`, `slug-3`, ...).
 * Ces doublons ("fantômes") s'accumulent si le bug à l'origine du double-createJob
 * se répète (ex : bug d'UUID d'adresses recréés à chaque import).
 *
 * ## Ce que fait ce script
 *
 * 1. Récupère en DB toutes les entrées `MissionJobBoard` L'Étudiant avec
 *    `syncStatus = ONLINE` dont le `publicId` porte un suffixe numérique (`-N`).
 * 2. Pour chaque fantôme `slug-N`, archive sur Piloty :
 *    - Toutes les versions précédentes (`slug-2`, `slug-3` ... `slug-(N-1)`)
 *      qui ne sont PAS présentes en DB (les entrées DB actives sont gérées
 *      par le job L'Étudiant normal et ne doivent pas être touchées ici).
 *    - Le fantôme lui-même (`slug-N`).
 * 3. Une réponse 404 de Piloty est traitée comme "non trouvé" (pas une erreur) :
 *    la version n'a peut-être jamais été créée côté Piloty.
 *
 * ## Résolution du company_public_id
 *
 * Piloty exige un `company_public_id` pour chaque PATCH. Le script le résout ainsi :
 * - Si `organization.letudiantPublicId` est renseigné en DB → utilisé directement.
 * - Sinon → recherche sur Piloty par nom via `findCompanyByName()`.
 * - En `--dry-run`, l'appel Piloty de fallback est sauté (les entrées sans
 *   `letudiantPublicId` en DB seront loggées comme "skipped").
 *
 * ## Usage
 *
 * ```bash
 * # Voir ce qui serait archivé sans effectuer d'appels Piloty
 * npx ts-node -r tsconfig-paths/register scripts/letudiant/archive-phantom-piloty-jobs.ts --env staging --dry-run
 *
 * # Archiver pour de vrai
 * npx ts-node -r tsconfig-paths/register scripts/letudiant/archive-phantom-piloty-jobs.ts --env production
 * ```
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Minimal early parse to detect --env <name> before importing modules that use env vars
function getEnvFromArgs(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--env" && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return undefined;
}

const envName = getEnvFromArgs();
if (envName) {
  const envPath = path.join(__dirname, `../../.env.${envName}`);
  console.log(`[Script] Loading env file: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

import { LETUDIANT_PILOTY_TOKEN } from "@/config";
import { JobBoardId } from "@/db/core";
import { prisma } from "@/db/postgres";
import { MEDIA_PUBLIC_ID } from "@/jobs/letudiant/config";
import { missionToPilotyCompany } from "@/jobs/letudiant/transformers";
import { rateLimit } from "@/jobs/letudiant/utils";
import { organizationService } from "@/services/organization";
import { PilotyClient } from "@/services/piloty";

/**
 * Parse a publicId with a numeric suffix, e.g. "my-mission-slug-42"
 * Returns { base: "my-mission-slug", suffix: 42 } or null if no suffix.
 */
function parseSuffixedPublicId(publicId: string): { base: string; suffix: number } | null {
  const match = publicId.match(/^(.+)-(\d+)$/);
  if (!match) return null;
  return { base: match[1], suffix: parseInt(match[2], 10) };
}

function loadProcessedIds(filePath: string): Set<string> {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveProcessedIds(filePath: string, ids: Set<string>): void {
  fs.writeFileSync(filePath, JSON.stringify([...ids].sort(), null, 2), "utf-8");
}

async function main() {
  if (!LETUDIANT_PILOTY_TOKEN) {
    console.error("LETUDIANT_PILOTY_TOKEN is not set in environment variables");
    process.exit(1);
  }

  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("[archive-phantom-piloty-jobs] DRY RUN — no Piloty API calls will be made");
  }

  const args = process.argv.slice(2);
  let limit: number | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && i + 1 < args.length) {
      limit = parseInt(args[i + 1], 10);
      if (isNaN(limit) || limit <= 0) {
        console.error("--limit must be a positive integer");
        process.exit(1);
      }
    }
  }
  if (limit !== undefined) {
    console.log(`[archive-phantom-piloty-jobs] Limit: ${limit} entries`);
  }

  const processedFilePath = path.join(__dirname, `archive-phantom-piloty-jobs.processed.${envName ?? "default"}.json`);
  const processedIds = loadProcessedIds(processedFilePath);
  if (processedIds.size > 0) {
    console.log(`[archive-phantom-piloty-jobs] Skipping ${processedIds.size} already-processed entry(ies) (from ${processedFilePath})`);
  }

  const skippedFilePath = path.join(__dirname, `archive-phantom-piloty-jobs.skipped.${envName ?? "default"}.json`);
  const skippedIds = loadProcessedIds(skippedFilePath);
  if (skippedIds.size > 0) {
    console.log(`[archive-phantom-piloty-jobs] Skipping ${skippedIds.size} previously-unresolvable entry(ies) (from ${skippedFilePath})`);
  }

  // 1. Fetch all ONLINE L'Étudiant job board entries with a suffixed publicId,
  //    excluding any whose base prefix has already been processed or whose exact
  //    publicId was previously unresolvable (no company public ID).
  const onlineEntries = await prisma.missionJobBoard.findMany({
    where: {
      jobBoardId: JobBoardId.LETUDIANT,
      syncStatus: "ONLINE",
      NOT: [...[...processedIds].map((base) => ({ publicId: { startsWith: `${base}-` } })), ...(skippedIds.size > 0 ? [{ publicId: { in: [...skippedIds] } }] : [])],
    },
    include: { mission: true },
  });

  // Substrings that permanently disqualify a publicId from being processed
  const EXCLUDED_SUBSTRINGS = ["arengosse"];

  const allPhantomEntries = onlineEntries
    .filter((entry) => {
      if (parseSuffixedPublicId(entry.publicId) === null) return false;
      if (EXCLUDED_SUBSTRINGS.some((s) => entry.publicId.includes(s))) return false;
      return true;
    })
    .sort((a, b) => parseSuffixedPublicId(b.publicId)!.suffix - parseSuffixedPublicId(a.publicId)!.suffix);
  const phantomEntries = limit !== undefined ? allPhantomEntries.slice(0, limit) : allPhantomEntries;

  if (!phantomEntries.length) {
    console.log("[archive-phantom-piloty-jobs] No suffixed ONLINE entries found. Nothing to do.");
    process.exit(0);
  }

  console.log(
    `[archive-phantom-piloty-jobs] Found ${allPhantomEntries.length} suffixed ONLINE entry(ies)` +
      (limit !== undefined ? `, processing first ${phantomEntries.length}.` : ", processing all.")
  );

  // 2. Collect all publicIds currently in DB for this job board (to avoid archiving live entries)
  const allPublicIds = new Set(onlineEntries.map((e) => e.publicId));

  // Count how many phantom entries share each base, to know when all suffixes are done
  const pendingCountByBase = new Map<string, number>();
  for (const entry of phantomEntries) {
    const base = parseSuffixedPublicId(entry.publicId)!.base;
    pendingCountByBase.set(base, (pendingCountByBase.get(base) ?? 0) + 1);
  }

  const client = new PilotyClient(LETUDIANT_PILOTY_TOKEN, MEDIA_PUBLIC_ID);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of phantomEntries) {
    const parsed = parseSuffixedPublicId(entry.publicId)!;

    // Resolve company public ID: prefer the one stored on the organization,
    // fall back to a Piloty search by name (mirrors the handler logic).
    let companyPublicId: string | null = null;
    const organizationId = entry.mission?.organizationId;
    if (organizationId) {
      const organization = await organizationService.findOneOrganizationById(organizationId);
      if (organization?.letudiantPublicId) {
        companyPublicId = organization.letudiantPublicId;
      } else if (organization && !isDryRun) {
        // Organization exists but has no letudiantPublicId yet — search Piloty by name
        const companyPayload = await missionToPilotyCompany(entry.mission as any);
        const pilotyCompany = await client.findCompanyByName(companyPayload.name);
        companyPublicId = pilotyCompany?.public_id ?? null;
        await rateLimit();
      }
    }

    if (!companyPublicId) {
      console.warn(
        `⚠ Skipping ${entry.publicId}: could not resolve company public ID` + ` (missionId: ${entry.mission?.id ?? "none"}, organizationId: ${organizationId ?? "none"})`
      );
      if (!isDryRun) {
        skippedIds.add(entry.publicId);
        saveProcessedIds(skippedFilePath, skippedIds);
      }
      skipped++;
      continue;
    }

    // Build the list of publicIds to archive:
    // - All previous versions (-2, -3, ..., -(suffix-1)) that are NOT in DB
    // - The phantom entry itself
    const toArchive: string[] = [];

    for (let i = 2; i < parsed.suffix; i++) {
      const previousId = `${parsed.base}-${i}`;
      if (!allPublicIds.has(previousId)) {
        toArchive.push(previousId);
      }
    }

    toArchive.push(entry.publicId);

    console.log(`\n→ Processing phantom: ${entry.publicId}`);
    console.log(`  Company: ${companyPublicId}`);
    console.log(`  Will archive: ${toArchive.join(", ")}`);

    for (const publicId of toArchive) {
      try {
        if (!isDryRun) {
          await client.updateJob(publicId, { media_public_id: MEDIA_PUBLIC_ID, company_public_id: companyPublicId, state: "archived" } as any);
        }
        console.log(`  ✓ Archived ${publicId}`);
        success++;
      } catch (err: any) {
        // A 404 means the job never existed on Piloty — not a real failure
        if (err?.status === 404 || err?.message?.includes("404")) {
          console.log(`  ~ ${publicId} not found on Piloty (skipped)`);
          skipped++;
        } else {
          console.error(`  ✗ Failed to archive ${publicId}:`, err);
          failed++;
        }
      }
      if (!isDryRun) {
        await rateLimit();
      }
    }

    if (!isDryRun) {
      const remaining = (pendingCountByBase.get(parsed.base) ?? 1) - 1;
      pendingCountByBase.set(parsed.base, remaining);
      if (remaining === 0) {
        // All suffixes for this base have been processed — safe to persist
        processedIds.add(parsed.base);
        saveProcessedIds(processedFilePath, processedIds);
      }
    }
  }

  console.log(`\n[archive-phantom-piloty-jobs] Done. Archived: ${success}, Not found: ${skipped}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
