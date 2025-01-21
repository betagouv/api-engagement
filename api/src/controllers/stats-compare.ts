import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_QUERY } from "../error";
import { EsQuery } from "../types";
import { UserRequest } from "../types/passport";

const router = Router();

router.get("/", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
        type: zod.string().optional(),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { isBot: true } }], should: [], filter: [] } } as EsQuery;

    if (query.data.publisherId) where.bool.filter.push({ term: { [`${query.data.flux}PublisherId.keyword`]: query.data.publisherId } });
    if (query.data.from && query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from, lte: query.data.to } } });
    else if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    else if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });

    const body = {
      query: where,
      size: 0,
      track_total_hits: true,
      aggs: {
        type: { terms: { field: "type.keyword", size: 10 } },
        publishers: {
          terms: { field: query.data.flux === "to" ? "fromPublisherId.keyword" : "toPublisherId.keyword", size: 1000 },
          aggs: {
            print: { filter: { term: { "type.keyword": "print" } } },
            apply: { filter: { term: { "type.keyword": "apply" } } },
            account: { filter: { term: { "type.keyword": "account" } } },
            click: { filter: { term: { "type.keyword": "click" } } },
            rate: {
              bucket_script: {
                buckets_path: {
                  apply: "apply._count",
                  click: "click._count",
                },
                script: "params.apply / params.click",
              },
            },
            name: {
              top_hits: {
                _source: { includes: [query.data.flux === "to" ? "fromPublisherName" : "toPublisherName"] },
                size: 1,
              },
            },
          },
        },
      },
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const data = {
      performance: {
        printCount: response.body.aggregations.type.buckets.find((b: { key: string }) => b.key === "print")?.doc_count || 0,
        clickCount: response.body.aggregations.type.buckets.find((b: { key: string }) => b.key === "click")?.doc_count || 0,
        applyCount: response.body.aggregations.type.buckets.find((b: { key: string }) => b.key === "apply")?.doc_count || 0,
        accountCount: response.body.aggregations.type.buckets.find((b: { key: string }) => b.key === "account")?.doc_count || 0,
        rate: response.body.aggregations.type.buckets.find((b: { key: string }) => b.key === "rate")?.doc_count || 0,
      },
      publishers: response.body.aggregations.publishers.buckets
        .filter((b: { key: string }) => b.key !== "")
        .map((b: { [key: string]: any }) => ({
          id: b.key,
          name: b.name.hits.hits[0]._source[query.data.flux === "to" ? "fromPublisherName" : "toPublisherName"],
          printCount: b.print.doc_count,
          clickCount: b.click.doc_count,
          accountCount: b.account.doc_count,
          applyCount: b.apply.doc_count,
          rate: b.rate.value,
        })),
    };

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
