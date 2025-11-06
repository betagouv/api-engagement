/**
 * Migration : appliquer le defaultMissionLogo du publisher
 * aux missions existantes dépourvues d’organizationLogo.
 *
 * Exécuter avec :
 *   DB_ENDPOINT="mongodb://..." ts-node migrate-mission-logos.ts
 */
import mongoose from "mongoose";
import { mongoConnected } from "../src/db/mongo";
import MissionModel from "../src/models/mission";
import { publisherService } from "../src/services/publisher";

async function run() {
  await mongoConnected;

  const publishers = (await publisherService.findPublishers({ includeDeleted: true })).filter((publisher) => !!publisher.defaultMissionLogo);

  for (const publisher of publishers) {
    const publisherId = publisher.id;
    const logo = publisher.defaultMissionLogo as string;

    const res = await MissionModel.updateMany(
      {
        publisherId,
        deleted: false,
        $or: [{ organizationLogo: { $exists: false } }, { organizationLogo: null }, { organizationLogo: "" }],
      },
      { $set: { organizationLogo: logo } }
    );

    console.log(`Publisher ${publisherId}: ${res.modifiedCount} missions mises à jour.`);
  }

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
