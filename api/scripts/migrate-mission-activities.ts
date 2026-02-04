import dotenv from "dotenv";
dotenv.config();

import { prismaCore } from "../../src/db/postgres";
import { ACTIVITIES } from "../../src/constants/activity";
import { isWhitelistedActivity, splitActivityString } from "../../src/utils/activity";

const DRY_RUN = process.argv.includes("--dry-run");

/** Même logique que activityService.resolveImportedActivities */
const resolveActivities = (raw: string): string[] => {
  const parsed = splitActivityString(raw);
  const resolved = parsed.map((name) => (isWhitelistedActivity(name) ? name : "Autre"));
  return [...new Set(resolved)];
};

const run = async () => {
  await prismaCore.$connect();
  console.log(`[MigrateActivities] Connected (DRY_RUN=${DRY_RUN})`);

  // 1. Upsert des labels whitelistés dans la table activity
  const activityIdMap = new Map<string, string>();
  for (const label of Object.values(ACTIVITIES)) {
    const existing = await prismaCore.activity.findUnique({ where: { name: label }, select: { id: true } });
    if (existing) {
      activityIdMap.set(label, existing.id);
    } else if (DRY_RUN) {
      console.log(`  [DryRun] Would create activity: "${label}"`);
    } else {
      const created = await prismaCore.activity.create({ data: { name: label } });
      activityIdMap.set(label, created.id);
      console.log(`  Created activity: "${label}" (${created.id})`);
    }
  }
  console.log(`[MigrateActivities] Activity table ready (${activityIdMap.size} whitelisted)`);

  // 2. Missions avec activityId legacy — les entrées existantes ne sont pas touchées
  const missions = await prismaCore.mission.findMany({
    where: { activityId: { not: null } },
    select: { id: true, activityId: true },
  });
  console.log(`[MigrateActivities] ${missions.length} missions avec activityId`);

  // Noms des activités legacy par ID
  const legacyActivities = await prismaCore.activity.findMany({ select: { id: true, name: true } });
  const nameById = new Map(legacyActivities.map((a) => [a.id, a.name]));

  // 3. Migration vers mission_activity
  let junctionCreated = 0;
  const errors: { missionId: string; error: string }[] = [];

  for (let i = 0; i < missions.length; i++) {
    const { id: missionId, activityId } = missions[i];
    const legacyName = nameById.get(activityId!);

    if (!legacyName) {
      errors.push({ missionId, error: `Activity ID ${activityId} introuvable` });
      continue;
    }

    const resolved = resolveActivities(legacyName);

    if (DRY_RUN) {
      if (i < 10 || i % 500 === 0) {
        console.log(`  [DryRun] ${missionId.slice(0, 8)}… "${legacyName}" → [${resolved.join(", ")}]`);
      }
      junctionCreated += resolved.length;
    } else {
      const targetIds = resolved.map((label) => activityIdMap.get(label)).filter((id): id is string => !!id);
      try {
        await prismaCore.missionActivity.createMany({
          data: targetIds.map((activityId) => ({ missionId, activityId })),
          skipDuplicates: true,
        });
        junctionCreated += targetIds.length;
      } catch (e: any) {
        errors.push({ missionId, error: e.message });
      }
    }

    if ((i + 1) % 500 === 0) {
      console.log(`[MigrateActivities] ${i + 1}/${missions.length} processed…`);
    }
  }

  console.log(`[MigrateActivities] Done.`);
  console.log(`  Missions processed : ${missions.length}`);
  console.log(`  Junction records   : ${junctionCreated}`);
  console.log(`  Errors             : ${errors.length}`);
  errors.slice(0, 10).forEach((e) => console.error(`    ${e.missionId}: ${e.error}`));
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(() => shutdown(0))
  .catch((error) => {
    console.error("[MigrateActivities] Failed", error);
    shutdown(1);
  });
