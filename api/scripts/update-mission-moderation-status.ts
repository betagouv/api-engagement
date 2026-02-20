/**
 * Script that updates remove all the moderation status on JVA missions, and set to PENDING all the moderation with no status
 */
import dotenv from "dotenv";
dotenv.config();

import { prismaCore } from "@/db/postgres";

async function cleanModerationRefusedCities() {
  const moderations = await prismaCore.missionModerationStatus.findMany({
    where: {
      status: "REFUSED",
      comment: "CONTENT_INSUFFICIENT",
    },
  });

  const events = await prismaCore.moderationEvent.findMany({
    where: {
      missionId: { in: moderations.map((m) => m.missionId) },
    },
  });

  let count = 0;
  let updated = 0;
  let skipped = 0;
  for (const moderation of moderations) {
    count++;
    const moderationEvents = events.filter((e) => e.missionId === moderation.missionId);
    const lastEvent = moderationEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!lastEvent) {
      console.error(`No event found for mission ${moderation.missionId}`);
      skipped++;
      continue;
    }
    if (lastEvent.userName !== "Modération automatique" || lastEvent.newStatus !== "REFUSED" || lastEvent.newComment !== "CONTENT_INSUFFICIENT") {
      console.error(`Event is not a refused event for mission ${moderation.missionId} ${lastEvent.userName} ${lastEvent.newStatus} ${lastEvent.newComment}`);
      skipped++;
      continue;
    }
    // console.log(`Updating moderation status for mission ${moderation.missionId}`);
    updated++;
    console.log(`Updating moderation status for mission ${moderation.missionId}, ${lastEvent.id}`);
    await prismaCore.missionModerationStatus.update({
      where: { id: moderation.id },
      data: { status: "PENDING", comment: null },
    });

    if (moderationEvents.length > 1) {
      await prismaCore.moderationEvent.delete({
        where: { id: lastEvent.id },
      });
    } else {
      await prismaCore.moderationEvent.update({
        where: { id: lastEvent.id },
        data: { newStatus: "PENDING", newComment: null },
      });
    }
    // if (updated > 5) {
    //   break;
    // }
  }
  console.log(`Total: ${count}, Updated: ${updated}, Skipped: ${skipped}`);
}

async function run() {
  await cleanModerationRefusedCities();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
