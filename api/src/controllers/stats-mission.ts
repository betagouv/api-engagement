import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_QUERY } from "../error";
import MissionModel from "../models/mission";
import { EsQuery } from "../types";
import { UserRequest } from "../types/passport";

const router = Router();

router.get("/mission-performance", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
        sort: zod.enum(["print", "click", "apply", "account", "rate"]).default("apply"),
        size: zod.coerce.number().default(25),
        skip: zod.coerce.number().default(0),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = {
      bool: { must: [], must_not: [{ term: { "missionId.keyword": "" } }, { term: { "isBot.keyword": true } }], should: [], filter: [{ exists: { field: "missionId" } }] },
    } as EsQuery;

    where.bool.filter.push({ term: { [`${query.data.flux}PublisherId.keyword`]: query.data.publisherId } });
    if (query.data.from && query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from, lte: query.data.to } } });
    else if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    else if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });

    const body = {
      query: where,
      size: 0,
      track_total_hits: true,
      aggs: {
        mission_count: {
          cardinality: {
            field: "missionId.keyword",
          },
        },
        missions: {
          terms: {
            field: "missionId.keyword",
            size: query.data.sort === "rate" ? 1000 : 50,
            order: ["print", "click", "apply", "account"].includes(query.data.sort || "") ? { [query.data.sort]: "desc" } : undefined,
          },

          aggs: {
            print: { filter: { term: { "type.keyword": "print" } } },
            account: { filter: { term: { "type.keyword": "account" } } },
            apply: { filter: { term: { "type.keyword": "apply" } } },
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
            mission_client_id: {
              top_hits: {
                _source: { includes: ["missionClientId"] },
                size: 1,
              },
            },
            mission_title: {
              top_hits: {
                _source: { includes: ["missionTitle"] },
                size: 1,
              },
            },
            organization_name: {
              top_hits: {
                _source: { includes: ["missionOrganizationName"] },
                size: 1,
              },
            },
            sort:
              query.data.sort === "rate"
                ? {
                    bucket_sort: {
                      sort: [{ rate: "desc" }],
                    },
                  }
                : undefined,
          },
        },
      },
    };
    const response = await esClient.search({ index: STATS_INDEX, body });

    const total = 50;
    const data = response.body.aggregations.missions.buckets
      .filter((b: { key: string }) => b.key !== "")
      .map((b: { [key: string]: any }) => ({
        _id: b.key,
        clientId: b.mission_client_id.hits.hits[0]?._source.missionClientId,
        title: b.mission_title.hits.hits[0]?._source.missionTitle,
        organizationName: b.organization_name.hits.hits[0]?._source.missionOrganizationName,
        printCount: b.print.doc_count,
        clickCount: b.click.doc_count,
        accountCount: b.account.doc_count,
        applyCount: b.apply.doc_count,
        rate: b.rate.value,
      }));

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/organisation-performance", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
        sort: zod.string().optional(),
        size: zod.coerce.number().default(25),
        skip: zod.coerce.number().default(0),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    where.bool.filter.push({ term: { [`${query.data.flux}PublisherId.keyword`]: query.data.publisherId } });
    if (query.data.from && query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from, lte: query.data.to } } });
    else if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    else if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });

    const sort = { bucket_sort: { sort: [{ "print._count": "desc" }], size: query.data.size, from: query.data.skip } } as any;
    if (query.data.sort === "clickCount") sort.bucket_sort.sort = [{ "click._count": "desc" }];
    else if (query.data.sort === "applyCount") sort.bucket_sort.sort = [{ "apply._count": "desc" }];
    else if (query.data.sort === "rate") sort.bucket_sort.sort = [{ rate: "desc" }];

    const body = {
      query: where,
      size: 0,
      track_total_hits: true,
      aggs: {
        organisation_count: {
          cardinality: {
            field: "missionOrganizationName.keyword",
          },
        },
        organisations: {
          terms: { field: "missionOrganizationName.keyword", size: 30000 },
          aggs: {
            print: { filter: { term: { "type.keyword": "print" } } },
            account: { filter: { term: { "type.keyword": "account" } } },
            apply: { filter: { term: { "type.keyword": "apply" } } },
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
            sort,
          },
        },
      },
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const total = response.body.aggregations.organisation_count.value;
    const data = response.body.aggregations.organisations.buckets
      .filter((b: { key: string }) => b.key !== "")
      .map((b: { [key: string]: any }) => ({
        name: b.key,
        printCount: b.print.doc_count,
        clickCount: b.click.doc_count,
        accountCount: b.account.doc_count,
        applyCount: b.apply.doc_count,
        rate: b.rate.value,
      }));

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/domain-performance", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
        sort: zod.string().optional(),
        size: zod.coerce.number().default(25),
        skip: zod.coerce.number().default(0),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    where.bool.filter.push({ term: { [`${query.data.flux}PublisherId.keyword`]: query.data.publisherId } });
    if (query.data.from && query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from, lte: query.data.to } } });
    else if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    else if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });

    const body = {
      query: where,
      size: 0,
      track_total_hits: true,
      aggs: {
        domains: {
          terms: { field: "missionDomain.keyword", size: 1000 },
          aggs: {
            print: { filter: { term: { "type.keyword": "print" } } },
            account: { filter: { term: { "type.keyword": "account" } } },
            apply: { filter: { term: { "type.keyword": "apply" } } },
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
          },
        },
      },
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const total = response.body.aggregations.domains.buckets.length;
    const data = response.body.aggregations.domains.buckets
      .filter((b: { key: string }) => b.key !== "")
      .map((b: { [key: string]: any }) => ({
        name: b.key,
        printCount: b.print.doc_count,
        clickCount: b.click.doc_count,
        accountCount: b.account.doc_count,
        applyCount: b.apply.doc_count,
        rate: b.rate.value,
      }));

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/domain-distribution", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
        flux: zod.enum(["to", "from"]).default("to"),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [{ term: { "isBot.keyword": true } }], should: [], filter: [] } } as EsQuery;

    where.bool.filter.push({ term: { [`${query.data.flux}PublisherId.keyword`]: query.data.publisherId } });
    if (query.data.from && query.data.to) where.bool.filter.push({ range: { createdAt: { gte: query.data.from, lte: query.data.to } } });
    else if (query.data.from) where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    else if (query.data.to) where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });

    const sort = { bucket_sort: { sort: [{ "print._count": "desc" }], size: query.data.size, from: query.data.skip } } as any;
    if (query.data.sort === "click") sort.bucket_sort.sort = [{ "click._count": "desc" }];
    else if (query.data.sort === "apply") sort.bucket_sort.sort = [{ "apply._count": "desc" }];
    else if (query.data.sort === "rate") sort.bucket_sort.sort = [{ rate: "desc" }];

    const body = {
      query: where,
      size: 0,
      track_total_hits: true,
      aggs: {
        domains: {
          terms: { field: "missionDomain.keyword", size: 1000 },
          aggs: {
            missions: { cardinality: { field: "missionId.keyword" } },
          },
        },
      },
    };

    const response = await esClient.search({ index: STATS_INDEX, body });

    const total = response.body.aggregations.domains.value;
    const data = response.body.aggregations.domains.buckets.filter((b: { key: string }) => b.key !== "");

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/moderation", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = {} as { [key: string]: any };

    where.publisherId = query.data.publisherId;

    if (query.data.from && query.data.to) where.createdAt = { $gte: query.data.from, $lte: query.data.to };
    else if (query.data.from) where.createdAt = { $gte: query.data.from };
    else if (query.data.to) where.createdAt = { $lte: query.data.to };

    const total = await MissionModel.countDocuments(where);
    const facets = await MissionModel.aggregate([
      { $match: where },
      {
        $facet: {
          status: [{ $group: { _id: "$statusCode", count: { $sum: 1 } } }],
          refused: [{ $match: { statusCode: "REFUSED" } }, { $group: { _id: "$statusComment", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 4 }],
        },
      },
    ]);

    const data = {
      accepted: facets[0].status.find((s: { _id: string }) => s._id === "ACCEPTED")?.count || 0,
      refused: facets[0].status.find((s: { _id: string }) => s._id === "REFUSED")?.count || 0,
      comments: facets[0].refused.map((r: { _id: string; count: number }) => ({
        comment: r._id,
        rate: facets[0].status.find((s: { _id: string }) => s._id === "REFUSED")?.count ? r.count / facets[0].status.find((s: { _id: string }) => s._id === "REFUSED")?.count : 0,
      })),
      rate: 0,
    };
    if (data.accepted + data.refused) data.rate = data.accepted / (data.accepted + data.refused);

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

export default router;
