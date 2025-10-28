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
import PublisherModel from "../src/models/publisher";

async function run() {
  await mongoConnected;

  const publishers = await PublisherModel.find({
    defaultMissionLogo: { $exists: true, $ne: "" },
  }).select({ _id: 1, name: 1, defaultMissionLogo: 1 });

  for (const publisher of publishers) {
    const publisherId = publisher._id.toString();
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
