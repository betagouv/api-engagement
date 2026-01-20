/**
 * Script that updates the publisher with "SDIS" in the name to have the mission type "volontariat_sapeurs_pompiers".
 */
import { prismaCore } from "../src/db/postgres";
import { PublisherMissionType } from "../src/types/publisher";

async function run() {
  const count = await prismaCore.publisher.count({
    where: { name: { contains: "SDIS", mode: "insensitive" } },
  });

  console.log(`Found ${count} publishers`);

  const res = await prismaCore.publisher.updateMany({
    where: { name: { contains: "SDIS", mode: "insensitive" } },
    data: { missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS },
  });

  console.log(`Updated ${res.count} publishers`);

  const sapeursPompiersPublishers = await prismaCore.publisher.count({
    where: { missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS },
  });

  console.log(`Found ${sapeursPompiersPublishers} publishers with mission type "volontariat_sapeurs_pompiers"`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
