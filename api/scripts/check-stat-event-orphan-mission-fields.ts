import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

async function check() {
  // Check orphan mission_id with mission_client_id not found in mission
  const orphanMissionId = await prisma.$queryRaw<{ check: string; count: bigint }[]>(
    Prisma.sql`
      SELECT 'mission_id not found in mission' AS "check", COUNT(*)::bigint AS count
      FROM "stat_event" se
      WHERE se."mission_id" IS NOT NULL AND se."mission_id" <> ''
        AND NOT EXISTS (
          SELECT 1 FROM "mission" m WHERE m."id" = se."mission_id"
        )
    `
  );

  console.table(orphanMissionId.map((r) => ({ check: r.check, count: Number(r.count) })));

  // Fix orphan mission_id with mission_client_id not found in mission
  const orphanClientId = await prisma.$queryRaw<{ check: string; count: bigint }[]>(
    Prisma.sql`
      SELECT 'orphan mission_id with mission_client_id not found in mission' AS "check", COUNT(*)::bigint AS count
      FROM "stat_event" se
      WHERE se."mission_id" IS NOT NULL AND se."mission_id" <> ''
        AND NOT EXISTS (
          SELECT 1 FROM "mission" m WHERE m."id" = se."mission_id"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "mission" m
          WHERE m."client_id" = se."mission_client_id"
            AND m."publisher_id" = se."to_publisher_id"
        )
    `
  );

  console.table(orphanClientId.map((r) => ({ check: r.check, count: Number(r.count) })));
  return;

  // Fix orphan mission_id with mission_client_id not found in mission
  // const orphans = await prisma.$queryRaw<{ id: string; mission_client_id: string; to_publisher_id: string }[]>(
  //   Prisma.sql`
  //     SELECT se."id", se."mission_client_id", se."to_publisher_id"
  //     FROM "stat_event" se
  //     WHERE se."mission_id" IS NOT NULL AND se."mission_id" <> ''
  //       AND NOT EXISTS (
  //         SELECT 1 FROM "mission" m WHERE m."id" = se."mission_id"
  //       )
  //       AND se."mission_client_id" IS NOT NULL AND se."mission_client_id" <> ''
  //     ORDER BY se."created_at" DESC
  //     LIMIT 30000
  //   `
  // );

  // console.log(`Found ${orphans.length} orphan stat_events to fix`);

  // let updated = 0;
  // let notFound = 0;
  // let i = 0;

  // for (const orphan of orphans) {
  //   i++;
  //   if (i % 100 === 0) {
  //     console.log(`Processing orphan ${i} of ${orphans.length} [cursor: ${orphan.id}]`);
  //   }
  //   const mission = await prisma.mission.findFirst({
  //     where: {
  //       clientId: orphan.mission_client_id,
  //       publisherId: orphan.to_publisher_id,
  //     },
  //     select: { id: true },
  //   });

  //   if (mission) {
  //     await prisma.statEvent.update({
  //       where: { id: orphan.id },
  //       data: { missionId: mission.id },
  //     });
  //     updated++;
  //   } else {
  //     notFound++;
  //   }
  // }

  // console.log(`Updated: ${updated}, Not found: ${notFound}`);

  // Set all orphan mission_id with mission_client_id not found in mission to null
  // const orphanClientIds = await prisma.$queryRaw<{ id: string }[]>(
  //   Prisma.sql`
  //     SELECT se."id"
  //     FROM "stat_event" se
  //     WHERE se."mission_id" IS NOT NULL AND se."mission_id" <> ''
  //       AND NOT EXISTS (
  //         SELECT 1 FROM "mission" m WHERE m."id" = se."mission_id"
  //       )
  //       AND NOT EXISTS (
  //         SELECT 1 FROM "mission" m
  //         WHERE m."client_id" = se."mission_client_id"
  //           AND m."publisher_id" = se."to_publisher_id"
  //       )
  //     LIMIT 10000
  //   `
  // );
  // console.log(`Found ${orphanClientIds.length} orphan stat_events to fix`);
  // for (const orphan of orphanClientIds) {
  //   await prisma.statEvent.update({
  //     where: { id: orphan.id },
  //     data: { missionId: null },
  //   });
  // }
}

check()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
