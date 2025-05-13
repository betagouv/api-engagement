import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_QUERY } from "../error";
import MissionModel from "../models/mission";
import PublisherModel from "../models/publisher";
import { EsQuery } from "../types";
import { UserRequest } from "../types/passport";

const router = Router();

router.get("/views", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        type: zod.enum(["volontariat", "benevolat"]).optional(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const where = {
      bool: { must: [], must_not: [{ term: { isBot: true } }], should: [], filter: [] },
    } as EsQuery;

    if (query.data.from && query.data.to) {
      where.bool.filter.push({
        range: { createdAt: { gte: query.data.from, lte: query.data.to } },
      });
    } else if (query.data.from) {
      where.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    } else if (query.data.to) {
      where.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });
    }

    if (query.data.type === "volontariat") {
      where.bool.filter.push({ term: { "toPublisherName.keyword": "Service Civique" } });
    } else if (query.data.type === "benevolat") {
      where.bool.filter.push({
        bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
      });
    }

    const aggs = {
      period: {
        date_histogram: {
          field: "createdAt",
          calendar_interval: query.data.to && query.data.from ? ((query.data.to.getTime() - query.data.from.getTime()) / (1000 * 60 * 60 * 24) > 62 ? "month" : "day") : "month",
          time_zone: "Europe/Paris",
        },
        aggs: {
          clicks_per_period: {
            filter: { term: { "type.keyword": "click" } },
            aggs: {
              volontariat: {
                filter: { term: { "toPublisherName.keyword": "Service Civique" } },
              },
              benevolat: {
                filter: {
                  bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
                },
              },
            },
          },
          applies_per_period: {
            filter: { term: { "type.keyword": "apply" } },
            aggs: {
              volontariat: {
                filter: { term: { "toPublisherName.keyword": "Service Civique" } },
              },
              benevolat: {
                filter: {
                  bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
                },
              },
            },
          },
        },
      },
      total_clicks: {
        filter: { term: { "type.keyword": "click" } },
      },
      total_applies: {
        filter: { term: { "type.keyword": "apply" } },
      },
      total_volontariat_clicks: {
        filter: {
          bool: {
            must: [{ term: { "type.keyword": "click" } }, { term: { "toPublisherName.keyword": "Service Civique" } }],
          },
        },
      },
      total_benevolat_clicks: {
        filter: {
          bool: {
            must: [{ term: { "type.keyword": "click" } }, { bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } } }],
          },
        },
      },
      total_volontariat_applies: {
        filter: {
          bool: {
            must: [{ term: { "type.keyword": "apply" } }, { term: { "toPublisherName.keyword": "Service Civique" } }],
          },
        },
      },
      total_benevolat_applies: {
        filter: {
          bool: {
            must: [{ term: { "type.keyword": "apply" } }, { bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } } }],
          },
        },
      },
    };

    const body = {
      track_total_hits: true,
      query: where,
      aggs: aggs,
      size: 0,
    };

    const response = await esClient.search({ index: STATS_INDEX, body: body });

    if (response.statusCode !== 200) {
      return next(response.body.error);
    }

    const data = {
      totalClicks: response.body.aggregations.total_clicks.doc_count,
      totalApplies: response.body.aggregations.total_applies.doc_count,
      totalVolontariatClicks: response.body.aggregations.total_volontariat_clicks.doc_count,
      totalBenevolatClicks: response.body.aggregations.total_benevolat_clicks.doc_count,
      totalVolontariatApplies: response.body.aggregations.total_volontariat_applies.doc_count,
      totalBenevolatApplies: response.body.aggregations.total_benevolat_applies.doc_count,
      histogram: response.body.aggregations.period.buckets.map((bucket: { [key: string]: any }) => ({
        key_as_string: bucket.key_as_string,
        key: new Date(bucket.key).toISOString(),
        doc_count: bucket.doc_count,
        clicks: {
          total: bucket.clicks_per_period.doc_count,
          volontariat: bucket.clicks_per_period.volontariat.doc_count,
          benevolat: bucket.clicks_per_period.benevolat.doc_count,
        },
        applies: {
          total: bucket.applies_per_period.doc_count,
          volontariat: bucket.applies_per_period.volontariat.doc_count,
          benevolat: bucket.applies_per_period.benevolat.doc_count,
        },
      })),
    };

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/created-missions", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        type: zod.enum(["volontariat", "benevolat"]).optional(),
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const interval = query.data.to && query.data.from ? ((query.data.to.getTime() - query.data.from.getTime()) / (1000 * 60 * 60 * 24) > 62 ? "month" : "day") : "month";

    const createdFacet = await MissionModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: query.data.from,
            $lte: query.data.to,
          },
        },
      },
      {
        $facet: {
          total: [{ $count: "total" }],
          volontariat: [{ $match: { publisherName: "Service Civique" } }, { $count: "total" }],
          benevolat: [{ $match: { publisherName: { $ne: "Service Civique" } } }, { $count: "total" }],
          histogram: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: interval === "day" ? "%Y-%m-%d" : "%Y-%m",
                    date: "$createdAt",
                  },
                },
                total: { $sum: 1 },
                volontariat: {
                  $sum: { $cond: [{ $eq: ["$publisherName", "Service Civique"] }, 1, 0] },
                },
                benevolat: {
                  $sum: { $cond: [{ $ne: ["$publisherName", "Service Civique"] }, 1, 0] },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const activeFacet = await MissionModel.aggregate([
      {
        $match: {
          $or: [{ deletedAt: { $gte: query.data.from } }, { deleted: false }],
          createdAt: { $lte: query.data.to },
        },
      },
      {
        $facet: {
          total: [{ $count: "total" }],
          volontariat: [{ $match: { publisherName: "Service Civique" } }, { $count: "total" }],
          benevolat: [{ $match: { publisherName: { $ne: "Service Civique" } } }, { $count: "total" }],
        },
      },
    ]);

    const data = {
      activeVolontariatMissions: activeFacet[0].volontariat.length ? activeFacet[0].volontariat[0].total || 0 : 0,
      activeBenevolatMissions: activeFacet[0].benevolat.length ? activeFacet[0].benevolat[0].total || 0 : 0,
      totalActiveMissions: activeFacet[0].total.length ? activeFacet[0].total[0].total || 0 : 0,
      totalMission: createdFacet[0].total.length ? createdFacet[0].total[0].total || 0 : 0,
      totalVolontariatMissions: createdFacet[0].volontariat.length ? createdFacet[0].volontariat[0].total || 0 : 0,
      totalBenevolatMissions: createdFacet[0].benevolat.length ? createdFacet[0].benevolat[0].total || 0 : 0,
      histogram: createdFacet[0].histogram.map((bucket: { [key: string]: any }) => ({
        key: new Date(bucket._id),
        doc_count: bucket.total,
        volontariat: bucket.volontariat,
        benevolat: bucket.benevolat,
      })),
    };

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/active-missions", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        type: zod.enum(["volontariat", "benevolat"]).optional(),
        from: zod.coerce.date(),
        to: zod.coerce.date(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const where = {
      $or: [{ deletedAt: { $gte: query.data.from } }, { deleted: false }],
      createdAt: { $lte: query.data.to },
    } as { [key: string]: any };

    if (query.data.type === "volontariat") {
      where.publisherName = "Service Civique";
    } else if (query.data.type === "benevolat") {
      where.publisherName = { $ne: "Service Civique" };
    }

    const interval = query.data.to && query.data.from ? ((query.data.to.getTime() - query.data.from.getTime()) / (1000 * 60 * 60 * 24) > 62 ? "month" : "day") : "month";
    const $facet = interval === "day" ? buildDaysFacets(query.data.from, query.data.to) : buildMonthFacets(query.data.from, query.data.to);

    const activeFacet = await MissionModel.aggregate([{ $match: where }, { $facet }]);

    const data = {
      histogram: Object.entries(activeFacet[0]).map(([key, value]) => {
        return {
          key: new Date(key.replace("_", ".")).toISOString(),
          doc_count: Array.isArray(value) && value.length ? value[0].total || 0 : 0,
          benevolat: Array.isArray(value) && value.length ? value[0].benevolat || 0 : 0,
          volontariat: Array.isArray(value) && value.length ? value[0].volontariat || 0 : 0,
        };
      }),
    };
    data.histogram.sort((a, b) => (a.key > b.key ? 1 : -1));

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/publishers-views", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        from: zod.coerce.date().optional(),
        to: zod.coerce.date().optional(),
        broadcaster: zod.string().optional(),
        announcer: zod.string().optional(),
        type: zod.enum(["volontariat", "benevolat", ""]).optional(),
        source: zod.enum(["widget", "campaign", "publisher", ""]).optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const viewQuery = {
      bool: { must_not: [{ term: { isBot: true } }], filter: [] } as { [key: string]: any },
    };

    if (query.data.from && query.data.to) {
      viewQuery.bool.filter.push({
        range: { createdAt: { gte: query.data.from, lte: query.data.to } },
      });
    } else if (query.data.from) {
      viewQuery.bool.filter.push({ range: { createdAt: { gte: query.data.from } } });
    } else if (query.data.to) {
      viewQuery.bool.filter.push({ range: { createdAt: { lte: query.data.to } } });
    }

    if (query.data.broadcaster) {
      viewQuery.bool.filter.push({
        bool: {
          should: query.data.broadcaster.split(",").map((id: string) => ({
            term: { "fromPublisherId.keyword": id },
          })),
        },
      });
    }

    if (query.data.announcer) {
      viewQuery.bool.filter.push({
        bool: {
          should: query.data.announcer.split(",").map((id: string) => ({
            term: { "toPublisherId.keyword": id },
          })),
        },
      });
    }

    if (query.data.type === "volontariat") {
      viewQuery.bool.filter.push({ term: { "toPublisherName.keyword": "Service Civique" } });
    } else if (query.data.type === "benevolat") {
      viewQuery.bool.filter.push({
        bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
      });
    }

    if (query.data.source) {
      viewQuery.bool.filter.push({ term: { "source.keyword": query.data.source } });
    }

    const viewAggs = {
      clickFrom: {
        filter: { term: { type: "click" } },
        aggs: { data: { terms: { field: "fromPublisherName.keyword", size: 1000 } } },
      },
      clickTo: {
        filter: { term: { type: "click" } },
        aggs: { data: { terms: { field: "toPublisherName.keyword", size: 1000 } } },
      },
      applyFrom: {
        filter: { term: { type: "apply" } },
        aggs: { data: { terms: { field: "fromPublisherName.keyword", size: 1000 } } },
      },
      applyTo: {
        filter: { term: { type: "apply" } },
        aggs: { data: { terms: { field: "toPublisherName.keyword", size: 1000 } } },
      },
      totalClick: { filter: { term: { type: "click" } } },
      totalApply: { filter: { term: { type: "apply" } } },
    };

    const viewBody = {
      query: viewQuery,
      aggs: viewAggs,
      size: 0,
    };
    const response = await esClient.search({ index: STATS_INDEX, body: viewBody });

    const publishers = await PublisherModel.find().lean();
    const data = publishers.map((p) => ({
      _id: p._id,
      name: p.name,
      annonceur: p.annonceur,
      api: p.api,
      campaign: p.campaign,
      widget: p.widget,
      clickFrom: response.body.aggregations.clickFrom.data.buckets.find((b: { key: string; doc_count: number }) => b.key === p.name)?.doc_count || 0,
      clickTo: response.body.aggregations.clickTo.data.buckets.find((b: { key: string; doc_count: number }) => b.key === p.name)?.doc_count || 0,
      applyFrom: response.body.aggregations.applyFrom.data.buckets.find((b: { key: string; doc_count: number }) => b.key === p.name)?.doc_count || 0,
      applyTo: response.body.aggregations.applyTo.data.buckets.find((b: { key: string; doc_count: number }) => b.key === p.name)?.doc_count || 0,
    }));

    const total = {
      publishers: publishers.length,
      announcers: publishers.filter((e) => {
        if (!e.annonceur) {
          return false;
        }
        if (query.data.type === "volontariat") {
          return e.name === "Service Civique";
        }
        if (query.data.type === "benevolat") {
          return e.name !== "Service Civique";
        }
        return true;
      }).length,
      broadcasters: publishers.filter((e) => {
        const isDiffuseur = e.api || e.campaign || e.widget;
        if (!isDiffuseur) {
          return false;
        }
        if (query.data.type === "volontariat") {
          return e.publishers?.some((p) => p.publisherName === "Service Civique");
        }
        if (query.data.type === "benevolat") {
          return e.publishers?.some((p) => p.publisherName !== "Service Civique");
        }
        return true;
      }).length,
      clicks: response.body.aggregations.totalClick.doc_count,
      applys: response.body.aggregations.totalApply.doc_count,
    };

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

const buildMonthFacets = (from: Date, to: Date) => {
  const facets = {} as { [key: string]: any };
  const start = new Date(from);
  const end = new Date(to);

  while (start <= end) {
    const year = start.getFullYear();
    const month = start.getMonth();
    const key = new Date(year, month, 1);
    facets[key.toISOString().replace(".", "_")] = [
      {
        $match: {
          $or: [{ deletedAt: { $gte: new Date(year, month, 1) } }, { deleted: false }],
          createdAt: { $lte: new Date(year, month + 1, 1) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          volontariat: { $sum: { $cond: [{ $eq: ["$publisherName", "Service Civique"] }, 1, 0] } },
          benevolat: { $sum: { $cond: [{ $ne: ["$publisherName", "Service Civique"] }, 1, 0] } },
        },
      },
    ];
    start.setMonth(start.getMonth() + 1);
  }

  return facets;
};

const buildDaysFacets = (from: Date, to: Date) => {
  const facets = {} as { [key: string]: any[] };
  const start = new Date(from);
  const end = new Date(to);

  while (start <= end) {
    const year = start.getFullYear();
    const month = start.getMonth();
    const day = start.getDate();
    const key = new Date(year, month, day);
    facets[key.toISOString().replace(".", "_")] = [
      {
        $match: {
          $or: [{ deletedAt: { $gte: new Date(year, month, day) } }, { deleted: false }],
          createdAt: { $lte: new Date(year, month, day + 1) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          volontariat: { $sum: { $cond: [{ $eq: ["$publisherName", "Service Civique"] }, 1, 0] } },
          benevolat: { $sum: { $cond: [{ $ne: ["$publisherName", "Service Civique"] }, 1, 0] } },
        },
      },
    ];
    start.setDate(start.getDate() + 1);
  }

  return facets;
};

export default router;
