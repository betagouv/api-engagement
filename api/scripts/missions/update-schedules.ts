/**
 * Remplace l'horaire des missions de dispositifs (SPV, gendarmerie, police) par le libellé court affiché sur les cartes.
 * Les missions sont réindexées dans Typesense (le schedule alimente la liste /missions).
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register scripts/missions/update-schedules.ts [--dry-run]
 */

import dotenv from "dotenv";

dotenv.config();

import { PUBLISHER_IDS } from "@/config";
import type { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";
import { missionIndexService } from "@/services/mission-index";

// Gendarmerie et police partagent le même ancien horaire : chacune est ciblée par publisher pour
// pouvoir recevoir son propre libellé.
const REPLACEMENTS: { label: string; where: Prisma.MissionWhereInput; newSchedule: string }[] = [
  {
    label: "SPV",
    where: { schedule: "Flexible (quelques heures par semaine selon disponibilités)" },
    newSchedule: "Flexible selon disponibilité",
  },
  {
    label: "Gendarmerie",
    where: { publisherId: PUBLISHER_IDS.GENDARMERIE, schedule: "Quelques jours par mois selon vos disponibilités" },
    newSchedule: "Quelques jours par mois",
  },
  {
    label: "Police",
    where: { publisherId: PUBLISHER_IDS.POLICE, schedule: "Quelques jours par mois selon vos disponibilités" },
    newSchedule: "Quelques jours par mois",
  },
];

const run = async () => {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(`\n🗓️  Mise à jour des horaires de missions${isDryRun ? " [DRY RUN]" : ""}`);

  for (const { label, where, newSchedule } of REPLACEMENTS) {
    const missions = await prisma.mission.findMany({ where, select: { id: true } });
    console.log(`\n📋  ${label} : ${missions.length} missions avec l'ancien horaire`);

    if (isDryRun || missions.length === 0) {
      continue;
    }

    const missionIds = missions.map(({ id }) => id);
    const result = await prisma.mission.updateMany({
      where: { id: { in: missionIds } },
      data: { schedule: newSchedule },
    });
    console.log(`🔄  ${result.count} missions mises à jour → "${newSchedule}"`);

    let indexErrors = 0;
    for (const missionId of missionIds) {
      try {
        await missionIndexService.upsert(missionId);
      } catch (error) {
        indexErrors++;
        console.error("   ❌ Réindexation impossible pour %s :", missionId, error);
      }
    }
    console.log(`🔎  ${missionIds.length - indexErrors} missions réindexées, ${indexErrors} erreurs`);
  }
  console.log("");
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
