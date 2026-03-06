/**
 * archive-missions-without-organization
 *
 * Archivage sur Piloty des entrées L'Étudiant ONLINE dont la mission
 * n'a plus d'organization valide (publisher_organization.organization_id_verified IS NULL
 * ou publisher_organization_id IS NULL).
 *
 * ## Contexte
 *
 * Le job L'Étudiant (`syncMission`) ignore ces missions avec le log
 * "Mission X has no organization, skipping". Résultat : elles restent indéfiniment
 * ONLINE sur Piloty sans jamais être mises à jour ni archivées.
 *
 * ## Ce que fait ce script
 *
 * 1. Récupère en DB toutes les entrées `MissionJobBoard` L'Étudiant avec
 *    `syncStatus = ONLINE` dont la mission n'a pas de `organization_id_verified`
 *    dans `publisher_organization`.
 * 2. Pour chaque entrée :
 *    - Archive le job sur Piloty (`state: "archived"`)
 *    - Met le `mission_jobboard` en OFFLINE
 * 3. Une réponse 404 de Piloty est traitée comme "déjà absent" : le `mission_jobboard`
 *    est quand même passé OFFLINE.
 *
 * ## Usage
 *
 * ```bash
 * # Voir ce qui serait archivé sans effectuer d'appels Piloty ni d'écritures en base
 * npx ts-node -r tsconfig-paths/register scripts/letudiant/archive-missions-without-organization.ts --env staging --dry-run
 *
 * # Archiver pour de vrai
 * npx ts-node -r tsconfig-paths/register scripts/letudiant/archive-missions-without-organization.ts --env production
 *
 * # Limiter le nombre d'entrées traitées (utile pour tester)
 * npx ts-node -r tsconfig-paths/register scripts/letudiant/archive-missions-without-organization.ts --env production --limit 50
 * ```
 */

import dotenv from "dotenv";
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
import { JobBoardId, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { MEDIA_PUBLIC_ID } from "@/jobs/letudiant/config";
import { rateLimit } from "@/jobs/letudiant/utils";
import missionJobBoardService from "@/services/mission-jobboard";
import { PilotyClient, PilotyError } from "@/services/piloty";

async function main() {
  if (!LETUDIANT_PILOTY_TOKEN) {
    console.error("[archive-missions-without-organization] LETUDIANT_PILOTY_TOKEN is not set in environment variables");
    process.exit(1);
  }

  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("[archive-missions-without-organization] DRY RUN — no Piloty API calls or DB writes will be made");
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
    console.log(`[archive-missions-without-organization] Limit: ${limit} entries`);
  }

  // Find all ONLINE L'Etudiant entries where the mission has no valid organization
  const allEntries = await prisma.$queryRaw<Array<{ missionId: string; missionAddressId: string | null; publicId: string }>>(
    Prisma.sql`
      SELECT
        mjb.mission_id      AS "missionId",
        mjb.mission_address_id AS "missionAddressId",
        mjb.public_id       AS "publicId"
      FROM mission_jobboard mjb
      JOIN mission m ON m.id = mjb.mission_id
      LEFT JOIN publisher_organization po ON po.id = m.publisher_organization_id
      WHERE mjb.jobboard_id = 'LETUDIANT'::"JobBoardId"
        AND mjb.sync_status = 'ONLINE'::"MissionJobBoardSyncStatus"
        AND (
          m.publisher_organization_id IS NULL
          OR po.organization_id_verified IS NULL
        )
      ORDER BY mjb.created_at ASC
    `
  );

  const entries = limit !== undefined ? allEntries.slice(0, limit) : allEntries;

  if (!entries.length) {
    console.log("[archive-missions-without-organization] No ONLINE entries without organization found. Nothing to do.");
    process.exit(0);
  }

  console.log(
    `[archive-missions-without-organization] Found ${allEntries.length} ONLINE entry(ies) without organization` +
      (limit !== undefined ? `, processing first ${entries.length}.` : ", processing all.")
  );

  const client = new PilotyClient(LETUDIANT_PILOTY_TOKEN, MEDIA_PUBLIC_ID);

  let archived = 0;
  let notFound = 0;
  let failed = 0;

  for (const entry of entries) {
    if (isDryRun) {
      console.log(`[DRY RUN] Would archive entry ${entry.publicId} (mission ${entry.missionId})`);
      archived++;
      continue;
    }

    try {
      console.log(`[archive-missions-without-organization] Archiving ${entry.publicId} (mission ${entry.missionId})`);
      await client.updateJob(entry.publicId, { state: "archived" } as any);
      await missionJobBoardService.upsert({
        jobBoardId: JobBoardId.LETUDIANT,
        missionId: entry.missionId,
        missionAddressId: entry.missionAddressId,
        publicId: entry.publicId,
        syncStatus: "OFFLINE",
      });
      console.log(`  ✓ Archived and marked OFFLINE`);
      archived++;
    } catch (error: any) {
      if (error instanceof PilotyError && error.status === 404) {
        // Already gone from Piloty — mark OFFLINE anyway
        console.log(`  ~ ${entry.publicId} not found on Piloty (404), marking OFFLINE`);
        await missionJobBoardService.upsert({
          jobBoardId: JobBoardId.LETUDIANT,
          missionId: entry.missionId,
          missionAddressId: entry.missionAddressId,
          publicId: entry.publicId,
          syncStatus: "OFFLINE",
          comment: "404 on archive",
        });
        notFound++;
      } else {
        console.error(`  ✗ Failed to archive ${entry.publicId}:`, error);
        failed++;
      }
    }

    await rateLimit();
  }

  const total = archived + notFound;
  console.log(
    `\n[archive-missions-without-organization] Done.` +
      ` Archived: ${archived}, Already gone (404→OFFLINE): ${notFound}, Failed: ${failed}` +
      (isDryRun ? " (dry run — no changes applied)" : ` — ${total} entries marked OFFLINE`)
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
