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
 *   npx ts-node scripts/fix-mission-event-undelete-type.ts --dry-run --sample 50
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
  type: string;
  created_at: Date;
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
const sampleSize = Math.max(Number(parseFlagValue("--sample") ?? "20"), 1);
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

  const sample = await prismaCore.$queryRaw<CandidateRow[]>`
    select
      me."id",
      me."mission_id",
      me."type",
      me."created_at",
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
    order by me."updated_at" desc
    limit ${sampleSize}
  `;

  console.log(`[MissionEventFix] Echantillon (max ${sampleSize}):`);
  for (const row of sample) {
    console.log(
      `- id=${row.id} mission_id=${row.mission_id} type=${row.type} previous=${row.deleted_at_previous} updated_at=${row.updated_at.toISOString()}`
    );
  }

  if (isDryRun) {
    console.log("[MissionEventFix] Dry-run uniquement. Relancer sans --dry-run pour appliquer.");
    return;
  }

  let updatedTotal = 0;
  let lastSeenId: string | null = null;

  while (true) {
    const batch: { id: string }[] = await prismaCore.$queryRaw<{ id: string }[]>`
      select me."id"
      from "mission_event" me
      where
        me."type" = 'delete'
        and jsonb_typeof(me."changes") = 'object'
        and me."changes" ? 'deletedAt'
        and jsonb_typeof(me."changes"->'deletedAt') = 'object'
        and (me."changes"->'deletedAt'->'current') = 'null'::jsonb
        and (me."changes"->'deletedAt'->>'previous') is not null
        and (${lastSeenId}::uuid is null or me."id" > ${lastSeenId}::uuid)
      order by me."id" asc
      limit ${batchSize}
    `;

    if (!batch.length) {
      break;
    }

    const ids: string[] = batch.map((row: { id: string }) => row.id);
    lastSeenId = ids[ids.length - 1] ?? lastSeenId;

    const result = await prismaCore.missionEvent.updateMany({
      where: { id: { in: ids } },
      data: { type: "update" },
    });
    updatedTotal += result.count;

    console.log(`[MissionEventFix] Batch corrige: ${result.count} (total: ${updatedTotal})`);
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
