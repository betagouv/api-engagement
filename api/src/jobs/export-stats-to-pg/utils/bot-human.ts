import { prismaAnalytics as prismaClient } from "../../../db/postgres";

import { captureException } from "../../../error";
import { Stats } from "../../../types";
import statEventRepository from "../../../repositories/stat-event";

const BATCH_SIZE = 5000;

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[BotSync] Started at ${start.toISOString()}.`);

    let processed = 0;
    let total = 0;
    let updatedBot = 0;
    let updatedHuman = 0;
    let cursor: string | null = null;

    while (true) {
      const { events, cursor: nextCursor, total: count } = await statEventRepository.scrollStatEvents({
        type: "click",
        batchSize: BATCH_SIZE,
        cursor,
        filters: { hasBotOrHumanFlag: true },
        sourceFields: ["isBot", "isHuman"],
      });

      const hits = events;
      if (!cursor) {
        total = count;
        console.log(`[BotSync] Total hits ${total}`);
      }
      cursor = nextCursor;

      if (!hits.length) {
        break;
      }

      const idsBot = new Set<string>();
      const idsHuman = new Set<string>();

      for (const s of hits) {
        if (s.isBot === true && s._id) {
          idsBot.add(s._id);
        }
        if (s.isHuman === true && s._id) {
          idsHuman.add(s._id);
        }
      }

      // Bulk update PG — set flags to true where needed
      if (idsBot.size) {
        const res = await prismaClient.click.updateMany({
          where: { old_id: { in: Array.from(idsBot) } },
          data: { is_bot: true },
        });
        updatedBot += res.count;
      }

      if (idsHuman.size) {
        const res = await prismaClient.click.updateMany({
          where: { old_id: { in: Array.from(idsHuman) } },
          data: { is_human: true },
        });
        updatedHuman += res.count;
      }

      processed += hits.length;
      console.log(`[BotSync] Batch processed=${hits.length}, total processed=${processed}, updatedBot+=${idsBot.size}, updatedHuman+=${idsHuman.size}`);
    }
    // Reset click
    const resetBot = await prismaClient.click.updateMany({
      where: { is_bot: true, updated_at: { lt: start } },
      data: { is_bot: false },
    });
    const resetHuman = await prismaClient.click.updateMany({
      where: { is_human: true, updated_at: { lt: start } },
      data: { is_human: false },
    });
    console.log(`[BotSync] Reset ${resetBot.count} bot clicks, ${resetHuman.count} human clicks.`);

    console.log(`[BotSync] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s. Updated bot=${updatedBot}, human=${updatedHuman}.`);
    return { updatedBot, updatedHuman };
  } catch (error) {
    captureException(error, "[BotSync] Error while syncing bot/human flags.");
    throw error;
  }
};

export default handler;
