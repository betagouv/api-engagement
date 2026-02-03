import dotenv from "dotenv";
dotenv.config();

import { prismaCore } from "../../src/db/postgres";

const run = async () => {
  await prismaCore.$connect();
  console.log("[VerifyMigration] Connected to PostgreSQL");

  // Count missions with activityId (old model)
  const missionsWithOldActivity = await prismaCore.mission.count({ where: { activityId: { not: null } } });
  console.log(`[VerifyMigration] Missions with activityId (old): ${missionsWithOldActivity}`);

  // Count distinct missions with junction records
  const missionsWithJunction = await prismaCore.missionActivity.findMany({
    select: { missionId: true },
    distinct: ["missionId"],
  });
  console.log(`[VerifyMigration] Missions with junction records: ${missionsWithJunction.length}`);

  // Total junction records
  const totalJunctionRecords = await prismaCore.missionActivity.count();
  console.log(`[VerifyMigration] Total junction records: ${totalJunctionRecords}`);

  // Check for orphaned junction records (mission doesn't exist)
  const orphaned = await prismaCore.missionActivity.findMany({
    where: { mission: { id: { not: { in: [] } } } }, // Prisma handles FK integrity, but let's check activity side
    include: { activity: true },
  });
  // More useful: check junction records pointing to non-existent activities
  const junctionWithoutActivity = await prismaCore.$queryRaw<{ mission_id: string; activity_id: string }[]>`
    SELECT ma.mission_id, ma.activity_id
    FROM mission_activity ma
    LEFT JOIN activity a ON ma.activity_id = a.id
    WHERE a.id IS NULL
    LIMIT 10
  `;
  console.log(`[VerifyMigration] Orphaned junction records (missing activity): ${junctionWithoutActivity.length}`);

  // Sample 10 missions and compare old vs new
  console.log("\n[VerifyMigration] Sampling 10 missions for comparison:");
  const sampleMissions = await prismaCore.mission.findMany({
    where: { activityId: { not: null } },
    take: 10,
    select: { id: true, activityId: true },
  });

  for (const mission of sampleMissions) {
    const oldActivity = await prismaCore.activity.findUnique({
      where: { id: mission.activityId! },
      select: { name: true },
    });

    const newActivities = await prismaCore.missionActivity.findMany({
      where: { missionId: mission.id },
      include: { activity: { select: { name: true } } },
    });

    const oldName = oldActivity?.name ?? "<none>";
    const newNames = newActivities.map((ma) => ma.activity.name).sort().join(", ") || "<none>";

    console.log(`  Mission ${mission.id.slice(0, 8)}...`);
    console.log(`    Old: ${oldName}`);
    console.log(`    New: ${newNames}`);
  }

  // Statistics
  console.log("\n[VerifyMigration] Statistics:");
  console.log(`  Coverage: ${missionsWithJunction.length}/${missionsWithOldActivity} missions migrated (${missionsWithOldActivity ? Math.round(missionsWithJunction.length / missionsWithOldActivity * 100) : 0}%)`);
  console.log(`  Avg activities per mission: ${missionsWithJunction.length ? (totalJunctionRecords / missionsWithJunction.length).toFixed(2) : 0}`);
};

const shutdown = async (exitCode: number) => {
  await prismaCore.$disconnect().catch(() => undefined);
  process.exit(exitCode);
};

run()
  .then(async () => {
    console.log("\n[VerifyMigration] Completed successfully");
    await shutdown(0);
  })
  .catch(async (error) => {
    console.error("[VerifyMigration] Failed", error);
    await shutdown(1);
  });
