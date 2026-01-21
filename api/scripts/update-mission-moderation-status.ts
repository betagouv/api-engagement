/**
 * Script that updates remove all the moderation status on JVA missions, and set to PENDING all the moderation with no status
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

const moderationComments = ["MISSION_CREATION_DATE_TOO_OLD", "MISSION_DATE_NOT_COMPATIBLE", "CONTENT_INSUFFICIENT"];

async function cleanModerationStatusesTitles() {
  // Find all the missions where title === comment
  const count = await prismaCore.missionModerationStatus.count({
    where: { title: { in: moderationComments } },
  });
  console.log(`Found ${count} mission moderation statuses with title === comment`);

  const res = await prismaCore.missionModerationStatus.updateMany({
    where: { title: { in: moderationComments } },
    data: { title: null },
  });
  console.log(`Updated ${res.count} mission moderation statuses with title === comment`);
}

async function run() {
  await deleteJeVeuxAiderModerationStatuses();
  await updateNullModerationStatusesToPending();
  await cleanModerationStatusesTitles();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
