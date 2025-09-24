import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { ASSOS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_BODY } from "../error";
import RequestModel from "../models/request";
import { PublisherRequest } from "../types/passport";

const router = Router();

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) {
      return;
    }
    const request = new RequestModel({
      method: req.method,
      key: req.headers["x-api-key"] || req.headers["apikey"],
      header: req.headers,
      route: `/v0/association${req.route.path}`,
      query: req.query,
      params: req.params,
      body: req.body,
      status: res.statusCode,
      code: res.locals.code,
      message: res.locals.message,
      total: res.locals.total,
    });
    await request.save();
  });
  next();
});

const SEARCH_FIELDS = [
  "identite_nom^10",
  "identite_sigle^5",
  "coordonnees_adresse_commune^4",
  "description^4",
  "coordonnees_adresse_region^3",
  "activites_objet^2",
  "activites_lib_famille1^2",
  "coordonnees_adresse_departement^1",
];

const SHOULD_EXIST = ["url", "linkedin", "facebook", "twitter", "donation", "coordonnees_courriel", "coordonnees_telephone"];

// Search in all etablissements.
router.post("/snu", passport.authenticate("api", { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        filters: zod
          .object({
            searchbar: zod.array(zod.string()).nullable().optional(),
            coordonnees_adresse_region: zod.array(zod.string()).nullable().optional(),
            coordonnees_adresse_departement: zod.array(zod.string()).nullable().optional(),
            activites_lib_theme1: zod.array(zod.string()).nullable().optional(),
          })
          .optional(),
        sort: zod
          .object({
            field: zod.string(),
            order: zod.enum(["asc", "desc"]),
          })
          .nullable()
          .optional(),
        size: zod.coerce.number().max(100).default(10),
        page: zod.coerce.number().default(0),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const hitsQuery = {
      bool: {
        filter: [{ bool: { should: SHOULD_EXIST.map((e) => ({ exists: { field: e, boost: 2 } })) } }],
      },
    } as { [key: string]: any };
    const facetsQuery = {
      bool: {
        filter: [{ bool: { should: SHOULD_EXIST.map((e) => ({ exists: { field: e, boost: 2 } })) } }],
      },
    } as { [key: string]: any };
    const facetsAggs = {
      coordonnees_adresse_region: {
        filter: { bool: { must: [] } },
        aggs: {
          names: {
            terms: { field: "coordonnees_adresse_region.keyword", missing: "N/A", size: 10000 },
          },
        },
      },
      coordonnees_adresse_departement: {
        filter: { bool: { must: [] } },
        aggs: {
          names: {
            terms: {
              field: "coordonnees_adresse_departement.keyword",
              missing: "N/A",
              size: 10000,
            },
          },
        },
      },
      activites_lib_theme1: {
        filter: { bool: { must: [] } },
        aggs: {
          names: {
            terms: { field: "activites_lib_theme1.keyword", missing: "N/A", size: 10000 },
          },
        },
      },
    } as { [key: string]: any };

    // Searchbar
    if ((body.data.filters?.searchbar?.length ?? 0) > 0) {
      const filter = {} as { [key: string]: any };
      const words = (body.data.filters?.searchbar?.[0] ?? "").trim().split(" ");
      filter.bool = { should: [] } as { should: any[] };
      words.forEach((word: string) => {
        filter.bool.should.push({
          multi_match: {
            query: word,
            fields: SEARCH_FIELDS,
            type: "cross_fields",
            operator: "and",
          },
        });
        filter.bool.should.push({
          multi_match: { query: word, fields: SEARCH_FIELDS, type: "phrase", operator: "and" },
        });
        filter.bool.should.push({
          multi_match: {
            query: word,
            fields: SEARCH_FIELDS,
            type: "phrase_prefix",
            operator: "and",
          },
        });
      });
      hitsQuery.bool.filter.push(filter);
    }

    // Region
    if ((body.data.filters?.coordonnees_adresse_region?.length ?? 0) > 0) {
      const filter = {} as { [key: string]: any };
      const regions = body.data.filters?.coordonnees_adresse_region ?? [];
      if (regions.includes("N/A")) {
        filter.bool = {
          should: [
            { bool: { must_not: { exists: { field: "coordonnees_adresse_region" } } } },
            {
              terms: {
                "coordonnees_adresse_region.keyword": regions.filter((e: string) => e !== "N/A"),
              },
            },
          ],
        };
      } else {
        filter.terms = {
          "coordonnees_adresse_region.keyword": regions,
        };
      }
      hitsQuery.bool.filter.push(filter);
      Object.keys(facetsAggs)
        .filter((k) => k !== "coordonnees_adresse_region")
        .forEach((key) => facetsAggs[key].filter.bool.must.push(filter));
    }

    // Departement
    if ((body.data.filters?.coordonnees_adresse_departement?.length ?? 0) > 0) {
      const filter = {} as { [key: string]: any };
      const departements = body.data.filters?.coordonnees_adresse_departement ?? [];
      if (departements.includes("N/A")) {
        filter.bool = {
          should: [
            { bool: { must_not: { exists: { field: "coordonnees_adresse_departement" } } } },
            {
              terms: {
                "coordonnees_adresse_departement.keyword": departements.filter((e: string) => e !== "N/A"),
              },
            },
          ],
        };
      } else {
        filter.terms = {
          "coordonnees_adresse_departement.keyword": departements,
        };
      }
      hitsQuery.bool.filter.push(filter);
      Object.keys(facetsAggs)
        .filter((k) => k !== "coordonnees_adresse_departement")
        .forEach((key) => facetsAggs[key].filter.bool.must.push(filter));
    }

    // Actitivies
    if ((body.data.filters?.activites_lib_theme1?.length ?? 0) > 0) {
      const filter = {} as { [key: string]: any };
      const activities = body.data.filters?.activites_lib_theme1 ?? [];
      if (activities.includes("N/A")) {
        filter.bool = {
          should: [
            { bool: { must_not: { exists: { field: "activites_lib_theme1" } } } },
            {
              terms: {
                "activites_lib_theme1.keyword": activities.filter((e: string) => e !== "N/A"),
              },
            },
          ],
        };
      } else {
        filter.terms = { "activites_lib_theme1.keyword": activities };
      }
      hitsQuery.bool.filter.push(filter);
      Object.keys(facetsAggs)
        .filter((k) => k !== "activites_lib_theme1")
        .forEach((key) => facetsAggs[key].filter.bool.must.push(filter));
    }

    const hitsBody = {
      query: hitsQuery,
      size: body.data.size,
      from: body.data.page > 0 ? body.data.page * body.data.size : 0,
      sort: body.data.sort ? [{ [body.data.sort.field]: body.data.sort.order }] : [{ createdAt: "desc" }],
    };
    const aggsBody = {
      query: facetsQuery,
      aggs: facetsAggs,
      size: 0,
      track_total_hits: true,
    };

    const responses = await esClient.msearch({
      body: [{ index: ASSOS_INDEX }, hitsBody, { index: ASSOS_INDEX }, aggsBody],
    });

    if (responses.body.responses[0].status !== 200) {
      res.locals = {
        code: responses.body.responses[0].status,
        message: responses.body.responses[0].error.type,
      };
    } else {
      res.locals = { total: responses.body.responses[0].hits.total.value };
    }
    return res.status(200).send(responses.body);
  } catch (error) {
    next(error);
  }
});

export default router;
