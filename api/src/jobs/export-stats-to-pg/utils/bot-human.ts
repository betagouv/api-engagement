import esClient from "../../../db/elastic";
import { prismaAnalytics as prismaClient } from "../../../db/postgres";

import { STATS_INDEX } from "../../../config";
import { captureException } from "../../../error";
import { Stats } from "../../../types";

const BATCH_SIZE = 5000;

const handler = async () => {
  try {
    const start = new Date();
    console.log(`[BotSync] Started at ${start.toISOString()}.`);

    let processed = 0;
    let total = 0;
    let updatedBot = 0;
    let updatedHuman = 0;
    let scrollId: string | null = null;

    while (true) {
      let hits: { _id: string; _source: Stats }[] = [];

      if (scrollId) {
        const { body } = await esClient.scroll({
          scroll: "20m",
          scroll_id: scrollId,
        });
        hits = body.hits.hits;
      } else {
        const { body } = await esClient.search({
          index: STATS_INDEX,
          scroll: "5m",
          size: BATCH_SIZE,
          body: {
            query: {
              bool: {
                filter: [
                  { term: { "type.keyword": "click" } },
                  {
                    bool: {
                      should: [{ term: { isBot: true } }, { term: { isHuman: true } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
            _source: ["isBot", "isHuman"],
          },
          track_total_hits: true,
        });
        scrollId = body._scroll_id;
        hits = body.hits.hits;
        total = body.hits.total.value;
        console.log(`[BotSync] Total hits ${total}`);
      }

      if (!hits.length) {
        break;
      }

      const idsBot = new Set<string>();
      const idsHuman = new Set<string>();

      for (const h of hits) {
        const s = h._source;
        if (s.isBot === true) {
          idsBot.add(h._id);
        }
        if (s.isHuman === true) {
          idsHuman.add(h._id);
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
