/**
 * Corrige les mission_event incoherents:
 * - type = 'delete'
 * - changes.deletedAt.current = null
 * - changes.deletedAt.previous non null
 *
 * Dans ce cas, le type attendu est 'update' (reactivation / undelete).
 *
 * Execution:
 *   npx ts-node scripts/fix-mission-event-undelete-type.ts
 *   npx ts-node scripts/fix-mission-event-undelete-type.ts --dry-run
 *   npx ts-node scripts/fix-mission-event-undelete-type.ts --batch 1000
 *
 * Comportement:
 * - par defaut: applique l'update en base
 * - avec --dry-run: preview (aucune ecriture)
 */
import dotenv from "dotenv";
dotenv.config();

import { prismaCore } from "../src/db/postgres";

type CandidateRow = {
  id: string;
  mission_id: string;
  updated_at: Date;
  deleted_at_previous: string | null;
};

const parseFlagValue = (flag: string): string | null => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
};

const isDryRun = process.argv.includes("--dry-run");
const batchSize = Math.max(Number(parseFlagValue("--batch") ?? "1000"), 1);

const run = async () => {
  const startedAt = new Date();
  console.log(`[MissionEventFix] Started at ${startedAt.toISOString()}`);
  console.log(`[MissionEventFix] Mode: ${isDryRun ? "dry-run" : "execute"}`);
  console.log(`[MissionEventFix] Batch size: ${batchSize}`);

  await prismaCore.$connect();

  const [countRow] = await prismaCore.$queryRaw<{ total: number }[]>`
    select count(*)::int as total
    from "mission_event" me
    where
      me."type" = 'delete'
      and jsonb_typeof(me."changes") = 'object'
      and me."changes" ? 'deletedAt'
      and jsonb_typeof(me."changes"->'deletedAt') = 'object'
      and (me."changes"->'deletedAt'->'current') = 'null'::jsonb
      and (me."changes"->'deletedAt'->>'previous') is not null
  `;

  const total = countRow?.total ?? 0;
  console.log(`[MissionEventFix] Lignes candidates: ${total}`);

  if (!total) {
    console.log("[MissionEventFix] Rien a corriger.");
    return;
  }

  let updatedTotal = 0;
  let lastSeenId: string | null = null;

  while (true) {
    const batch: CandidateRow[] = await prismaCore.$queryRaw<CandidateRow[]>`
      select
        me."id",
        me."mission_id",
        me."updated_at",
        me."changes"->'deletedAt'->>'previous' as deleted_at_previous
      from "mission_event" me
      where
        me."type" = 'delete'
        and jsonb_typeof(me."changes") = 'object'
        and me."changes" ? 'deletedAt'
        and jsonb_typeof(me."changes"->'deletedAt') = 'object'
        and (me."changes"->'deletedAt'->'current') = 'null'::jsonb
        and (me."changes"->'deletedAt'->>'previous') is not null
        and (${lastSeenId}::text is null or me."id"::text > ${lastSeenId}::text)
      order by me."id"::text asc
      limit ${batchSize}
    `;

    if (!batch.length) {
      break;
    }

    const ids: string[] = batch.map((row) => row.id);
    lastSeenId = ids[ids.length - 1] ?? lastSeenId;

    const prefix = isDryRun ? "[MissionEventFix][DRY-RUN]" : "[MissionEventFix]";
    for (const row of batch) {
      console.log(
        `${prefix} id=${row.id} mission_id=${row.mission_id} previous=${row.deleted_at_previous} updated_at=${row.updated_at.toISOString()}`
      );
    }

    if (isDryRun) {
      updatedTotal += batch.length;
      continue;
    }

    const result = await prismaCore.missionEvent.updateMany({
      where: { id: { in: ids } },
      data: { type: "update" },
    });
    updatedTotal += result.count;

    console.log(`[MissionEventFix] Batch corrige: ${result.count} (total: ${updatedTotal})`);
  }

  if (isDryRun) {
    console.log(`[MissionEventFix] Lignes qui seraient corrigees: ${updatedTotal}`);
    return;
  }

  console.log(`[MissionEventFix] Lignes corrigees: ${updatedTotal}`);
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
    console.error("[MissionEventFix] Failed:", error);
    await shutdown(1);
  });
