/**
 * Script that updates remove all the moderation status on JVA missions, and set to PENDING all the moderation with no status
 */
import { PUBLISHER_IDS } from "@/config";
import { prismaCore } from "@/db/postgres";
import { publisherService } from "@/services/publisher";

const DRY_RUN = process.argv.includes("--dry-run");

async function deleteWrongPartnerModerationStatuses() {
  const jva = await publisherService.findOnePublisherById(PUBLISHER_IDS.JEVEUXAIDER);

  if (!jva) {
    throw new Error("JVA not found");
  }

  const partners = jva.publishers.map((p) => p.diffuseurPublisherId);
  console.log(`Found ${partners.length} partners`);

  const where = { mission: { publisherId: { notIn: partners } } };
  // Delete all mission moderation statuses with JeVeuxAider.gouv.fr as publisherId
  const count = await prismaCore.missionModerationStatus.count({ where });
  console.log(`Found ${count} mission moderation statuses with JeVeuxAider.gouv.fr as publisherId`);

  if (!DRY_RUN) {
    const res = await prismaCore.missionModerationStatus.deleteMany({
      where,
    });
    console.log(`Deleted ${res.count} mission moderation statuses with JeVeuxAider.gouv.fr as publisherId`);
  } else {
    console.log("Dry run, skipping deletion");
  }
}

async function run() {
  await deleteWrongPartnerModerationStatuses();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
