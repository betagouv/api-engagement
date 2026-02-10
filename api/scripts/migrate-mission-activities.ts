import dotenv from "dotenv";
dotenv.config();

import { ACTIVITIES } from "../src/constants/activity";
import { prismaCore } from "../src/db/postgres";
import { activityService } from "../src/services/activity";

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Migrate mission activities to 1-n relationship to N-N
 * - Upsert existing activities from whitelisted ones (see config/activity.ts)
 * - Migrate missions with activity_id through mission_activity
 * No activity will be deleted: activity_id legacy field will be keeped for now
 */
const run = async () => {
  await prismaCore.$connect();
  console.log(`[MigrateActivities] Connected (DRY_RUN=${DRY_RUN})`);

  // Upsert existing activities
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

  // Find missions with legacy field
  const missions = await prismaCore.mission.findMany({
    where: { activityId: { not: null } },
    select: { id: true, activityId: true },
  });
  console.log(`[MigrateActivities] ${missions.length} missions avec activityId`);

  const legacyActivities = await prismaCore.activity.findMany({ select: { id: true, name: true } });
  const nameById = new Map(legacyActivities.map((a) => [a.id, a.name]));

  // Migrate data
  let junctionCreated = 0;
  const errors: { missionId: string; error: string }[] = [];

  for (let i = 0; i < missions.length; i++) {
    const { id: missionId, activityId } = missions[i];
    const legacyName = nameById.get(activityId!);

    if (!legacyName) {
      errors.push({ missionId, error: `Activity ID ${activityId} introuvable` });
      continue;
    }

    const resolved = activityService.resolveImportedActivities(legacyName);

    if (DRY_RUN) {
      if (i < 10 || i % 500 === 0) {
        console.log(`  [DryRun] ${missionId.slice(0, 8)}… "${legacyName}" → [${resolved.join(" // ")}]`);
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
