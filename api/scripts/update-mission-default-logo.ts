/**
 * Migration : appliquer le defaultMissionLogo du publisher
 * aux missions existantes dépourvues d’organizationLogo.
 *
 * Exécuter avec :
 *   pnpm ts-node --transpile-only api/scripts/update-mission-default-logo.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { prismaCore } from "../src/db/postgres";
import { publisherService } from "../src/services/publisher";

async function run() {
  await prismaCore.$connect();

  const publishers = (await publisherService.findPublishers({ includeDeleted: true })).filter((publisher) => !!publisher.defaultMissionLogo);

  for (const publisher of publishers) {
    const publisherId = publisher.id;
    const logo = publisher.defaultMissionLogo as string;

    const res = await prismaCore.mission.updateMany({
      where: {
        publisherId,
        deletedAt: null,
        OR: [{ organizationLogo: null }, { organizationLogo: "" }],
      },
      data: {
        organizationLogo: logo,
      },
    });

    console.log(`Publisher ${publisherId}: ${res.count} missions mises à jour.`);
  }

  await prismaCore.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
