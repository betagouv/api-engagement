/**
 * Script that updates the publisher with "SDIS" in the name to have the mission type "volontariat_sapeurs_pompiers".
 */
import { PUBLISHER_IDS } from "../src/config";
import { prismaCore } from "../src/db/postgres";

async function deleteJeVeuxAiderModerationStatuses() {
  // Delete all mission moderation statuses with JeVeuxAider.gouv.fr as publisherId
  const count = await prismaCore.missionModerationStatus.count({
    where: { mission: { publisherId: PUBLISHER_IDS.JEVEUXAIDER } },
  });
  console.log(`Found ${count} mission moderation statuses with JeVeuxAider.gouv.fr as publisherId`);

  const res = await prismaCore.missionModerationStatus.deleteMany({
    where: { mission: { publisherId: PUBLISHER_IDS.JEVEUXAIDER } },
  });

  console.log(`Deleted ${res.count} mission moderation statuses with JeVeuxAider.gouv.fr as publisherId`);
}
async function updateNullModerationStatusesToPending() {
  // Update all mission moderation statuses with status null to PENDING
  const count = await prismaCore.missionModerationStatus.count({
    where: { status: null },
  });
  console.log(`Found ${count} mission moderation statuses with status null`);

  const res = await prismaCore.missionModerationStatus.updateMany({
    where: { status: null },
    data: { status: "PENDING" },
  });

  console.log(`Updated ${res.count} mission moderation statuses with status null`);
}
async function run() {
  await deleteJeVeuxAiderModerationStatuses();
  await updateNullModerationStatusesToPending();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
