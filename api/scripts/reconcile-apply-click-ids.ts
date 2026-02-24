/**
 * Reconciliation des click_id pour les stat_event de type "apply" historiques.
 * Cas cible: click_id au format ES (non-uuid) avant migration ES -> Postgres.
 *
 * Usage (depuis api/):
 *   npx ts-node scripts/reconcile-apply-click-ids.ts --from 2025-10-01 --to 2025-10-20
 *
 * Options:
 *   --from <date>              Date de depart (obligatoire). Ex: 2025-10-01 ou 2025-10-01T00:00:00Z
 *   --to <date>                Date de fin (exclusive). Ex: 2025-10-20
 *   --batch <nombre>           Taille de lot (defaut: 500)
 *   --last-id <uuid>           Reprise a partir d'un id core (stat_event)
 *   --dry-run                  Active le mode dry-run (sinon execute)
 *   --log-every <nombre>       En dry-run, log 1 ligne toutes les N updates (defaut: 1)
 */
import dotenv from "dotenv";
dotenv.config();

import { pgConnectedCore, prismaCore } from "@/db/postgres";

type CoreApplyRow = {
  id: string;
  clickId: string | null;
  createdAt: Date;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseFlagValue = (flag: string): string | null => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
};

const parseNumberFlag = (flag: string, defaultValue: number): number => {
  const raw = parseFlagValue(flag);
  if (!raw) {
    return defaultValue;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return parsed;
};

const parseDateFlag = (flag: string, required = false): Date | null => {
  const raw = parseFlagValue(flag);
  if (!raw) {
    if (required) {
      throw new Error(`Le flag ${flag} est obligatoire.`);
    }
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Date invalide pour ${flag}: ${raw}`);
  }
  return parsed;
};

const isUuid = (value: string) => UUID_REGEX.test(value);

const BATCH_SIZE = parseNumberFlag("--batch", 500);
const FROM_DATE = parseDateFlag("--from", true);
const TO_DATE = parseDateFlag("--to");
const LAST_ID = parseFlagValue("--last-id");
const DRY_RUN = process.argv.includes("--dry-run");

const run = async () => {
  if (!FROM_DATE) {
    throw new Error("Le parametre --from est requis.");
  }

  const startedAt = new Date();
  console.log(`[ApplyClickReconcile] Debut: ${startedAt.toISOString()}`);
  console.log(`[ApplyClickReconcile] Mode: ${DRY_RUN ? "dry-run" : "execute"}`);
  console.log(`[ApplyClickReconcile] Plage: ${FROM_DATE.toISOString()} -> ${TO_DATE ? TO_DATE.toISOString() : "(sans fin)"}`);
  console.log(`[ApplyClickReconcile] Batch: ${BATCH_SIZE}`);

  await pgConnectedCore();

  let lastId = LAST_ID;
  let scanned = 0;
  let candidates = 0;
  let updated = 0;
  let coreClickMissing = 0;
  let invalidClickId = 0;

  while (true) {
    const where = {
      type: "apply" as const,
      createdAt: {
        gte: FROM_DATE,
        ...(TO_DATE ? { lt: TO_DATE } : {}),
      },
      clickId: { not: null },
      ...(lastId ? { id: { gt: lastId } } : {}),
    };

    const batch = await prismaCore.statEvent.findMany({
      where,
      select: {
        id: true,
        clickId: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    });

    if (!batch.length) {
      break;
    }

    for (const event of batch as CoreApplyRow[]) {
      scanned++;
      if (!event.clickId || isUuid(event.clickId)) {
        invalidClickId++;
        continue;
      }

      candidates++;

      const coreClick = await prismaCore.statEvent.findUnique({
        where: { esId: event.clickId },
        select: { id: true, esId: true, createdAt: true, type: true },
      });

      if (!coreClick || coreClick.type !== "click") {
        coreClickMissing++;
        continue;
      }

      if (!DRY_RUN) {
        await prismaCore.statEvent.update({
          where: { id: event.id },
          data: { clickId: coreClick.id },
        });
      }

      updated++;

      if (DRY_RUN) {
        console.log(
          [
            "[ApplyClickReconcile][DryRun]",
            `core_apply=${event.id}`,
            `core_apply_click_id_old=${event.clickId}`,
            `core_click_new=${coreClick.id}`,
            `core_click_es_id=${coreClick.esId}`,
          ].join(" | ")
        );
      }

      if (!DRY_RUN && updated % 100 === 0) {
        console.log(`[ApplyClickReconcile] ${updated} updates`);
      }
    }

    lastId = batch[batch.length - 1].id;
    console.log(`[ApplyClickReconcile] Batch termine. Cursor: ${lastId}`);
  }

  console.log("\n[ApplyClickReconcile] Resume");
  console.log(`- Lignes scannees: ${scanned}`);
  console.log(`- Candidates (click_id non-uuid): ${candidates}`);
  console.log(`- Updates ${DRY_RUN ? "(dry-run)" : ""}: ${updated}`);
  console.log(`- Click core introuvable: ${coreClickMissing}`);
  console.log(`- Click_id deja au format uuid: ${invalidClickId}`);
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
    console.error("[ApplyClickReconcile] Erreur:", error);
    await shutdown(1);
  });
