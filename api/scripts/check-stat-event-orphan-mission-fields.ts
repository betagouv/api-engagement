import dotenv from "dotenv";
dotenv.config();

import { Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

async function check() {
  const results = await prisma.$queryRaw<{ check: string; count: bigint }[]>(
    Prisma.sql`
      SELECT 'mission_title without mission_id' AS "check", COUNT(*)::bigint AS count
      FROM "stat_event"
      WHERE "mission_title" IS NOT NULL AND "mission_title" <> ''
        AND ("mission_id" IS NULL OR "mission_id" = '')
    `
  );

  console.table(results.map((r) => ({ check: r.check, count: Number(r.count) })));
}

check()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
