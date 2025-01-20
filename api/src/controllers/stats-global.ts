import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_QUERY } from "../error";
import { EsQuery } from "../types";
import { UserRequest } from "../types/passport";

const router = Router();

router.get("/broadcast-preview", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    if (query.data.publisherId) where.bool.filter.push({ term: { "fromPublisherId.keyword": query.data.publisherId } });
    if (query.data.from && query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from, lte: query.data.to } } });
    else if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    else if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });

    const body = {
      query: where,
      size: 0,
      track_total_hits: true,
      aggs: {
        totalClick: {
          filter: { term: { type: "click" } },
        },
        totalApply: {
          filter: { term: { type: "apply" } },
        },
        totalPrint: {
          filter: { term: { type: "print" } },
        },
        totalAccount: {
          filter: { term: { type: "account" } },
        },
        totalMissionApply: {
          filter: { term: { type: "apply" } },
          aggs: {
            missions: {
              cardinality: {
                field: "missionId.keyword",
              },
            },
          },
        },
        totalMissionClick: {
          filter: { term: { type: "click" } },
          aggs: {
            missions: {
              cardinality: {
                field: "missionId.keyword",
              },
            },
          },
        },
      },
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const data = {
      totalClick: response.body.aggregations.totalClick.doc_count,
      totalApply: response.body.aggregations.totalApply.doc_count,
      totalPrint: response.body.aggregations.totalPrint.doc_count,
      totalAccount: response.body.aggregations.totalAccount.doc_count,
      totalMissionApply: response.body.aggregations.totalMissionApply.missions.value,
      totalMissionClick: response.body.aggregations.totalMissionClick.missions.value,
    };

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/announce-preview", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    if (query.data.publisherId) where.bool.filter.push({ term: { "toPublisherId.keyword": query.data.publisherId } });
    if (query.data.from) where.bool.must.push({ range: { createdAt: { gte: query.data.from } } });
    if (query.data.to) where.bool.must.push({ range: { createdAt: { lte: query.data.to } } });

    const body = {
      query: where,
      size: 0,
      track_total_hits: true,
      aggs: {
        totalClick: {
          filter: { term: { type: "click" } },
        },
        totalApply: {
          filter: { term: { type: "apply" } },
        },
        totalPrint: {
          filter: { term: { type: "print" } },
        },
        totalAccount: {
          filter: { term: { type: "account" } },
        },
        totalMissionClicked: {
          filter: { term: { type: "click" } },
          aggs: {
            missions: {
              cardinality: {
                field: "missionId.keyword",
              },
            },
          },
        },
      },
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const data = {
      totalPrint: response.body.aggregations.totalPrint.doc_count,
      totalClick: response.body.aggregations.totalClick.doc_count,
      totalApply: response.body.aggregations.totalApply.doc_count,
      totalAccount: response.body.aggregations.totalAccount.doc_count,
      totalMissionClicked: response.body.aggregations.totalMissionClicked.missions.value,
    };

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/distribution", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
        type: zod.enum(["click", "apply", "print", "account"]).optional(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    if (query.data.publisherId) where.bool.filter.push({ term: { "fromPublisherId.keyword": query.data.publisherId } });
    if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });
    if (query.data.type) where.bool.filter.push({ term: { type: query.data.type } });

    const body = {
      query: where,
      size: 0,
      track_total_hits: true,
      aggs: {
        by_source: {
          terms: {
            field: "source.keyword",
          },
          aggs: {
            total_count: {
              value_count: { field: "_id" },
            },
          },
        },
      },
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const data = response.body.aggregations.by_source.buckets.map((b: any) => ({
      key: b.key,
      doc_count: b.total_count.value,
    }));

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/evolution", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.coerce.date(),
        to: zod.coerce.date(),
        type: zod.enum(["click", "apply", "print", "account"]).optional(),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const diff = (query.data.to.getTime() - query.data.from.getTime()) / (1000 * 60 * 60 * 24);
    const interval = diff < 1 ? "hour" : diff < 61 ? "day" : "month";

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    if (query.data.publisherId) where.bool.filter.push({ term: { [`${query.data.flux}PublisherId.keyword`]: query.data.publisherId } });
    if (query.data.from && query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from, lte: query.data.to } } });
    else if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    else if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });
    if (query.data.type) where.bool.filter.push({ term: { type: query.data.type.toString() } });

    const body = {
      track_total_hits: true,
      query: where,
      aggs: {
        topPublishers: {
          terms: {
            field: query.data.flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword",
            size: 4,
          },
        },
        histogram: {
          date_histogram: {
            field: "createdAt",
            calendar_interval: interval,
            time_zone: "Europe/Paris",
          },
          aggs: {
            publishers: {
              terms: {
                field: query.data.flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword",
                size: 80,
              },
            },
          },
        },
        users: {
          terms: {
            field: "user.keyword",
            size: 5,
          },
        },
      },
      sort: [{ createdAt: { order: "desc" } }],
      size: 0,
    };

    const response = await esClient.search({ index: STATS_INDEX, body });
    if (response.statusCode !== 200) next(response.body.error);

    const data = {
      histogram: response.body.aggregations.histogram.buckets,
      topPublishers: response.body.aggregations.topPublishers.buckets.map((b: any) => b.key),
      total: response.body.hits.total.value,
    };

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/broadcast-publishers", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    if (query.data.publisherId) where.bool.filter.push({ term: { [`${query.data.flux}PublisherId.keyword`]: query.data.publisherId } });
    if (query.data.from && query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from, lte: query.data.to } } });
    else if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    else if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });

    const body = {
      query: where,
      aggs: {
        by_announcer: {
          terms: {
            field: query.data.flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword",
            size: 1000,
          },
          aggs: {
            total_click: {
              filter: { term: { type: "click" } },
              aggs: {
                count: { value_count: { field: "_id" } },
              },
            },
            total_apply: {
              filter: { term: { type: "apply" } },
              aggs: {
                count: { value_count: { field: "_id" } },
              },
            },
            total_account: {
              filter: { term: { type: "account" } },
              aggs: {
                count: { value_count: { field: "_id" } },
              },
            },
            total_print: {
              filter: { term: { type: "print" } },
              aggs: {
                count: { value_count: { field: "_id" } },
              },
            },
          },
        },
      },
      size: 0,
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const data = response.body.aggregations.by_announcer.buckets.map((bucket: any) => ({
      publisherName: bucket.key,
      clickCount: bucket.total_click.count.value,
      applyCount: bucket.total_apply.count.value,
      accountCount: bucket.total_account.count.value,
      printCount: bucket.total_print.count.value,
      rate: bucket.total_click.count.value ? bucket.total_apply.count.value / bucket.total_click.count.value : 0,
    }));

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/announce-publishers", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        type: zod.enum(["click", "apply", "print", "account"]).optional(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    if (query.data.publisherId) where.bool.filter.push({ term: { [`${query.data.flux}PublisherId.keyword`]: query.data.publisherId } });
    if (query.data.from && query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from, lte: query.data.to } } });
    else if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    else if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });
    if (query.data.type) where.bool.filter.push({ term: { type: query.data.type } });

    const body = {
      query: where,
      aggs: {
        announcer: {
          terms: {
            field: query.data.flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword",
            size: 100,
          },
        },
      },
      size: 0,
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const data = response.body.aggregations.announcer.buckets;
    const total = response.body.aggregations.announcer.buckets.length;

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/missions", async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().optional(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    if (query.data.publisherId) where.bool.filter.push({ term: { "fromPublisherId.keyword": query.data.publisherId } });
    if (query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    if (query.data.from) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });

    const body = {
      query: where,
      track_total_hits: true,
      aggs: {
        by_announcer: {
          terms: {
            field: "toPublisherName.keyword",
            size: 1000,
          },
          aggs: {
            uniqueMissions: {
              cardinality: { field: "missionId.keyword" },
            },
          },
        },
      },
      size: 0,
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const data = response.body.aggregations.by_announcer.buckets.map((bucket: any) => ({
      key: bucket.key,
      doc_count: bucket.uniqueMissions.value,
    }));

    const total = response.body.hits.total.value;

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

export default router;
