import esClient from "../../db/elastic";
import { postMessage } from "../../services/slack";
import { SLACK_WARNING_CHANNEL_ID, STATS_INDEX } from "../../config";

const countApply = async (user: string) => {
  const res = await esClient.count({
    body: {
      query: {
        bool: {
          must: [{ term: { "type.keyword": "apply" } }, { term: { "clickUser.keyword": user } }],
        },
      },
    },
    index: STATS_INDEX,
  });
  return res.body.count;
};

const countAccount = async (user: string) => {
  const res = await esClient.count({
    body: {
      query: {
        bool: {
          must: [{ term: { "type.keyword": "account" } }, { term: { "clickUser.keyword": user } }],
        },
      },
    },
    index: STATS_INDEX,
  });
  return res.body.count;
};

export const checkBotClicks = async () => {
  console.log(`Checking bot from stats`);

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Query to find users with high click counts and check for matched applies
  const body = {
    size: 0,
    query: {
      bool: {
        must: [{ range: { createdAt: { gte: oneDayAgo } } }, { term: { "type.keyword": "click" } }],
      },
    },
    aggs: {
      by_user: {
        terms: {
          field: "user.keyword",
          min_doc_count: 200,
        },
        aggs: {
          clicks: {
            filter: { term: { "type.keyword": "click" } },
          },
          publishers: {
            terms: {
              field: "fromPublisherName.keyword",
              size: 2,
            },
          },
          userAgent: {
            terms: {
              field: "userAgent.keyword",
              size: 1,
            },
          },
        },
      },
    },
  };

  const response = await esClient.search({ index: STATS_INDEX, body });

  const suspiciousUsers: any[] = [];

  for (const bucket of response.body.aggregations.by_user.buckets) {
    const totalClicks = bucket.clicks.doc_count;
    const applies = await countApply(bucket.key);
    const accounts = await countAccount(bucket.key);
    const publishers = bucket.publishers.buckets;

    // Suspicious if: many clicks, no applies, and all clicks from same publisher
    if (totalClicks >= 200 && applies === 0 && accounts === 0 && publishers.length === 1) {
      suspiciousUsers.push(bucket);
    }
  }

  if (suspiciousUsers.length > 0) {
    const message = `*Potentiel bot activity detecté*\n\n${suspiciousUsers
      .map((bucket: any) => {
        const publisher = bucket.publishers.buckets[0];
        const userAgent = bucket.userAgent.buckets[0];
        return `• User \`${bucket.key}\` a fait ${bucket.clicks.doc_count} clicks avec 0 candidatures en 24h (tous depuis le publisher \`${publisher.key}\`)\n\t- User Agent: \`${userAgent.key}\``;
      })
      .join("\n")}`;

    await postMessage({ text: message }, SLACK_WARNING_CHANNEL_ID);
  }
};
