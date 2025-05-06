import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_QUERY } from "../error";
import MissionModel from "../models/mission";
import { EsQuery } from "../types";

const router = Router();

const buildMonthFacets = (year: number) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const facets = {} as { [key: string]: any[] };
  const lastMonth = year === currentYear ? currentMonth : 11;

  for (let m = 0; m <= lastMonth; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 1);
    facets[m] = [
      {
        $match: {
          createdAt: { $lt: end },
          $or: [{ deletedAt: { $gte: start } }, { deleted: false }],
        },
      },
      { $count: "doc_count" },
    ];
  }

  return facets;
};

router.get("/graph-stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        department: zod.string().optional(),
        type: zod.string().optional(),
        year: zod.coerce.number().optional().default(new Date().getFullYear()),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const viewQuery = {
      bool: { must_not: [{ term: { isBot: true } }], filter: [] } as { [key: string]: any },
    };

    if (query.data.department) {
      viewQuery.bool.filter.push({
        term: { "missionDepartmentName.keyword": query.data.department },
      });
    }

    if (query.data.type === "volontariat") {
      viewQuery.bool.filter.push({ term: { "toPublisherName.keyword": "Service Civique" } });
    } else if (query.data.type === "benevolat") {
      viewQuery.bool.filter.push({
        bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
      });
    }

    if (query.data.year) {
      viewQuery.bool.filter.push({
        range: {
          createdAt: {
            gte: new Date(query.data.year, 0, 1).toISOString(),
            lte: new Date(query.data.year, 11, 31).toISOString(),
          },
        },
      });
    }

    const viewBody = {
      track_total_hits: true,
      query: viewQuery,
      aggs: {
        months: {
          date_histogram: { field: "createdAt", calendar_interval: "month", format: "yyyy-MM" },
          aggs: {
            click: {
              filter: { term: { "type.keyword": "click" } },
            },
            apply: {
              filter: { term: { "type.keyword": "apply" } },
            },
          },
        },

        organizations: {
          date_histogram: {
            field: "createdAt",
            calendar_interval: "month",
            format: "yyyy-MM",
          },
          aggs: {
            unique_organizations: {
              cardinality: {
                field: "missionOrganizationName.keyword",
              },
            },
          },
        },
        organizations_count: {
          cardinality: {
            field: "missionOrganizationName.keyword",
          },
        },
      },
      size: 0,
    };

    const viewResponse = await esClient.search({ index: STATS_INDEX, body: viewBody });
    if (viewResponse.statusCode !== 200) {
      next(viewResponse.body.error);
    }

    const data = {
      clicks: viewResponse.body.aggregations.months.buckets
        .filter((bucket: { key_as_string: string }) =>
          bucket.key_as_string.startsWith(query.data.year.toString())
        )
        .map((bucket: { key_as_string: string; click: { doc_count: number } }) => ({
          key: bucket.key_as_string,
          doc_count: bucket.click.doc_count,
        })),
      totalClicks: viewResponse.body.aggregations.months.buckets.reduce(
        (acc: number, bucket: { click: { doc_count: number } }) => acc + bucket.click.doc_count,
        0
      ),
      applies: viewResponse.body.aggregations.months.buckets
        .filter((bucket: { key_as_string: string }) =>
          bucket.key_as_string.startsWith(query.data.year.toString())
        )
        .map((bucket: { key_as_string: string; apply: { doc_count: number } }) => ({
          key: bucket.key_as_string,
          doc_count: bucket.apply.doc_count,
        })),
      totalApplies: viewResponse.body.aggregations.months.buckets.reduce(
        (acc: number, bucket: { apply: { doc_count: number } }) => acc + bucket.apply.doc_count,
        0
      ),

      organizations: viewResponse.body.aggregations.organizations.buckets
        .filter((bucket: { key_as_string: string }) =>
          bucket.key_as_string.startsWith(query.data.year.toString())
        )
        .map((bucket: { key_as_string: string; unique_organizations: { value: number } }) => ({
          key: bucket.key_as_string,
          doc_count: bucket.unique_organizations.value,
        })),
      totalOrganizations: viewResponse.body.aggregations.organizations_count.value,
    };

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/graph-missions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        department: zod.string().optional(),
        type: zod.string().optional(),
        year: zod.coerce.number().optional().default(new Date().getFullYear()),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const whereMissions = {} as { [key: string]: any };

    if (query.data.department) {
      whereMissions.departmentName = query.data.department;
    }

    if (query.data.type === "volontariat") {
      whereMissions.publisherName = "Service Civique";
    } else if (query.data.type === "benevolat") {
      whereMissions.publisherName = { $ne: "Service Civique" };
    }

    if (query.data.year) {
      whereMissions.$or = [
        { deletedAt: { $gte: new Date(query.data.year, 0, 1) } },
        { deleted: false },
      ];
    }

    const $facet = buildMonthFacets(query.data.year);

    const missionFacets = await MissionModel.aggregate([{ $match: whereMissions }, { $facet }]);
    const total = await MissionModel.countDocuments(whereMissions);
    const data = Object.entries(missionFacets[0]).map(([m, value]) => {
      const month = parseInt(m, 10);
      return {
        key: `${query.data.year}-${month < 9 ? "0" : ""}${month + 1}`,
        doc_count: Array.isArray(value) && value.length ? value[0].doc_count || 0 : 0,
      };
    });

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/domains", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        department: zod.string().optional(),
        type: zod.string().optional(),
        year: zod.coerce.number().optional().default(new Date().getFullYear()),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const filters = [
      {
        range: {
          createdAt: {
            gte: new Date(query.data.year, 0, 1).toISOString(),
            lte: new Date(query.data.year, 11, 31).toISOString(),
          },
        },
      },
    ] as EsQuery["bool"]["filter"];

    if (query.data.department) {
      filters.push({ term: { "missionDepartmentName.keyword": query.data.department } });
    }

    if (query.data.type === "volontariat") {
      filters.push({ term: { "toPublisherName.keyword": "Service Civique" } });
    } else if (query.data.type === "benevolat") {
      filters.push({
        bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
      });
    }

    const body = {
      track_total_hits: true,
      query: {
        bool: {
          must_not: [{ term: { isBot: true } }],
          must: filters.length > 0 ? filters : [{ match_all: {} }],
        },
      },
      aggs: {
        per_year: {
          date_histogram: {
            field: "createdAt",
            calendar_interval: "year",
          },
          aggs: {
            domains: {
              terms: { field: "missionDomain.keyword", size: 100 },
              aggs: {
                unique_missions: {
                  cardinality: { field: "missionId.keyword" },
                },
                click: {
                  filter: { term: { "type.keyword": "click" } },
                },
                apply: {
                  filter: { term: { "type.keyword": "apply" } },
                },
              },
            },
          },
        },
      },
      size: 0,
    };

    const response = await esClient.search({ index: STATS_INDEX, body });
    if (response.statusCode !== 200) {
      return next(response.body.error);
    }

    const aggs = response.body.aggregations;

    const data = aggs.per_year.buckets.map(
      (yearBucket: { key: string; domains: { buckets: any[] } }) => ({
        year: new Date(yearBucket.key).getFullYear(),
        domains: yearBucket.domains.buckets.map((domainBucket) => ({
          key: domainBucket.key,
          doc_count: domainBucket.unique_missions.value,
          click: domainBucket.click.doc_count,
          apply: domainBucket.apply.doc_count,
        })),
      })
    );

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/departments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        year: zod.coerce.number().optional().default(new Date().getFullYear()),
        type: zod.string().optional(),
      })

      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const filter = [
      {
        range: {
          createdAt: {
            gte: new Date(query.data.year, 0, 1).toISOString(),
            lte: new Date(query.data.year, 11, 31).toISOString(),
          },
        },
      },
    ] as EsQuery["bool"]["filter"];

    if (query.data.type === "volontariat") {
      filter.push({ term: { "toPublisherName.keyword": "Service Civique" } });
    } else if (query.data.type === "benevolat") {
      filter.push({
        bool: { must_not: { term: { "toPublisherName.keyword": "Service Civique" } } },
      });
    }
    const aggBody = {
      size: 0,
      query: {
        bool: {
          must_not: [{ term: { isBot: true } }],
          filter,
        },
      },
      aggs: {
        departments: {
          terms: {
            field: "missionPostalCode.keyword",
            size: 120,
          },
          aggs: {
            unique_missions: {
              cardinality: {
                field: "missionId.keyword",
              },
            },
            clicks: {
              filter: { term: { "type.keyword": "click" } },
            },
            applies: {
              filter: { term: { "type.keyword": "apply" } },
            },
          },
        },
      },
    };

    const response = await esClient.search({ index: STATS_INDEX, body: aggBody });

    const data = response.body.aggregations.departments.buckets.map(
      (b: {
        key: string;
        unique_missions: { value: number };
        clicks: { doc_count: number };
        applies: { doc_count: number };
      }) => ({
        key: b.key,
        mission_count: b.unique_missions.value,
        click_count: b.clicks.doc_count,
        apply_count: b.applies.doc_count,
      })
    );

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
