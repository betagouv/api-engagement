import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

import { prismaCore } from "../../src/db/postgres";
import { ACTIVITIES } from "../../src/constants/activity";
import { splitActivityString, isWhitelistedActivity } from "../../src/utils/activity";

const DRY_RUN = process.argv.includes("--dry-run");
const REPORTS_DIR = path.resolve(__dirname, "../../reports");
const MAPPINGS_PATH = path.join(REPORTS_DIR, "activity-mappings.json");

interface ActivityMapping {
  originalName: string;
  mappedTo: string[];
}

const run = async () => {
  await prismaCore.$connect();
  console.log(`[MigrateMissionActivities] Connected to PostgreSQL (DRY_RUN=${DRY_RUN})`);

  // Step 1: Upsert all whitelisted activities
  console.log("[MigrateMissionActivities] Upserting whitelisted activities...");
  const activityIdMap = new Map<string, string>();

  for (const name of Object.values(ACTIVITIES)) {
    const existing = await prismaCore.activity.findUnique({ where: { name }, select: { id: true } });
    if (existing) {
      activityIdMap.set(name, existing.id);
    } else if (!DRY_RUN) {
      const created = await prismaCore.activity.create({ data: { name } });
      activityIdMap.set(name, created.id);
      console.log(`  Created activity: "${name}" (${created.id})`);
    } else {
      console.log(`  [DryRun] Would create activity: "${name}"`);
    }
  }
  console.log(`[MigrateMissionActivities] Activity table ready (${activityIdMap.size} whitelisted)`);

  // Step 2: Load manual mappings
  let manualMappings = new Map<string, string[]>();
  if (fs.existsSync(MAPPINGS_PATH)) {
    const raw: ActivityMapping[] = JSON.parse(fs.readFileSync(MAPPINGS_PATH, "utf-8"));
    for (const m of raw) {
      manualMappings.set(m.originalName, m.mappedTo);
    }
    console.log(`[MigrateMissionActivities] Loaded ${manualMappings.size} manual mappings`);
  } else {
    console.log("[MigrateMissionActivities] No manual mappings file found — proceeding with automatic splitting only");
  }

  // Step 3: Fetch all missions with activityId
  const missions = await prismaCore.mission.findMany({
    where: { activityId: { not: null } },
    select: { id: true, activityId: true },
  });
  console.log(`[MigrateMissionActivities] Found ${missions.length} missions with activityId`);

  // Pre-load activity names by id
  const activityRecords = await prismaCore.activity.findMany({ select: { id: true, name: true } });
  const activityNameById = new Map(activityRecords.map((a) => [a.id, a.name]));

  let processed = 0;
  let created = 0;
  let skipped = 0;
  const errors: { missionId: string; error: string }[] = [];

  for (const mission of missions) {
    const originalName = activityNameById.get(mission.activityId!);
    if (!originalName) {
      errors.push({ missionId: mission.id, error: `Activity ID ${mission.activityId} not found in activity table` });
      continue;
    }

    // Resolve activity names: manual mapping takes priority, otherwise auto-split
    let resolvedNames: string[];
    if (manualMappings.has(originalName)) {
      resolvedNames = manualMappings.get(originalName)!;
    } else {
      resolvedNames = splitActivityString(originalName);
    }

    // Filter to whitelisted only
    resolvedNames = resolvedNames.filter((name) => isWhitelistedActivity(name));

    if (!resolvedNames.length) {
      skipped++;
      if (processed < 10 || processed % 100 === 0) {
        console.log(`  [Skip] Mission ${mission.id}: "${originalName}" → no whitelisted activities after filtering`);
      }
      processed++;
      continue;
    }

    // Resolve IDs for the target activities
    const targetIds: string[] = [];
    for (const name of resolvedNames) {
      const id = activityIdMap.get(name);
      if (id) {
        targetIds.push(id);
      } else if (!DRY_RUN) {
        // Activity exists but wasn't in our pre-loaded map — shouldn't happen but handle gracefully
        const existing = await prismaCore.activity.findUnique({ where: { name }, select: { id: true } });
        if (existing) {
          activityIdMap.set(name, existing.id);
          targetIds.push(existing.id);
        }
      }
    }

    if (!DRY_RUN && targetIds.length) {
      try {
        await prismaCore.missionActivity.createMany({
          data: targetIds.map((activityId) => ({ missionId: mission.id, activityId })),
          skipDuplicates: true,
        });
        created += targetIds.length;
      } catch (e: any) {
        errors.push({ missionId: mission.id, error: e.message });
      }
    } else if (DRY_RUN) {
      if (processed < 10 || processed % 100 === 0) {
        console.log(`  [DryRun] Mission ${mission.id}: "${originalName}" → [${resolvedNames.join(", ")}]`);
      }
      created += targetIds.length;
    }

    processed++;
    if (processed % 100 === 0) {
      console.log(`[MigrateMissionActivities] Processed ${processed}/${missions.length} missions...`);
    }
  }

  console.log(`[MigrateMissionActivities] Done.`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Junction records created: ${created}`);
  console.log(`  Skipped (no whitelisted match): ${skipped}`);
  console.log(`  Errors: ${errors.length}`);

  if (errors.length) {
    const errorPath = path.join(REPORTS_DIR, "migration-errors.json");
    fs.writeFileSync(errorPath, JSON.stringify(errors, null, 2), "utf-8");
    console.log(`  Error report: ${errorPath}`);
  }
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    console.log("[MigrateMissionActivities] Completed successfully");
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[MigrateMissionActivities] Failed", error);
    await shutdown(1);
  });
