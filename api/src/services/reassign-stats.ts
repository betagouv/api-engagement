import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { captureException } from "../error";
import { Account, EsQuery } from "../types";

export const reassignStats = async (where: EsQuery, update: { [key: string]: any }) => {
  try {
    let processed = 0;
    let scrollId = null;

    while (true) {
      let hits = [];

      if (scrollId) {
        const { body } = await esClient.scroll({
          scroll: "20m",
          scroll_id: scrollId,
        });
        hits = body.hits.hits;
      } else {
        const { body } = await esClient.search({
          index: STATS_INDEX,
          scroll: "20m",
          body: {
            query: where,
            size: 10000,
            track_total_hits: true,
          },
        });
        scrollId = body._scroll_id;
        hits = body.hits.hits;
      }
      if (hits.length === 0) {
        break;
      }

      const bulkOps = hits.flatMap((e: { _id: string; _source: Account }) => [
        { update: { _index: STATS_INDEX, _id: e._id } },
        {
          doc: update,
        },
      ]);

      const { body: response } = await esClient.bulk({ refresh: true, body: bulkOps });
      processed += response.items.length;

      if (response.errors) {
        processed -= response.items.filter((e: any) => e.index.error).length;
        const errors = response.items.filter((item: any) => item.update && item.update.error);
        captureException("Reassign stats failed", JSON.stringify(errors, null, 2));
      }
    }
    return processed;
  } catch (error) {
    console.error("Error in updateAccounts:", error);
  }
};
