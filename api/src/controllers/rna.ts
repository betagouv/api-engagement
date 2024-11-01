import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { RNA_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import { EsQuery, Mission } from "../types";
import { UserRequest } from "../types/passport";

const router = Router();

router.get("/", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        department: zod.string().optional(),
        city: zod.string().optional(),
        search: zod.string().optional(),
        size: zod.coerce.number().int().min(1).max(100).default(10),
        from: zod.coerce.number().int().min(0).default(0),
      })
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const where = { bool: { must: [], must_not: [], should: [], filter: [] } } as EsQuery;

    if (query.data.department) where.bool.filter.push({ term: { "address_department_name.keyword": query.data.department } });
    if (query.data.city) where.bool.filter.push({ term: { "address_city.keyword": query.data.city } });
    if (query.data.search) {
      where.bool.must = { multi_match: { query: query.data.search, fields: ["title", "rna", "siret"], type: "best_fields", operator: "or", fuzziness: 2 } };
    }

    const aggs = {
      departements: { terms: { field: "address_department_code.keyword" } },
      cities: { terms: { field: "address_city.keyword" } },
    };

    const esBody = {
      query: where,
      aggs,
      size: query.data.size,
      from: query.data.from,
      track_total_hits: true,
    };

    const response = await esClient.search({ index: RNA_INDEX, body: esBody });
    const total = response.body.hits.total.value;
    const data = {
      hits: response.body.hits.hits.map((h: { _id: string; _source: Mission }) => ({ _id: h._id, ...h._source })),
      aggs: {
        departments: response.body.aggregations.departements.buckets,
        cities: response.body.aggregations.cities.buckets,
      },
    };
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });

    const response = await esClient.get({ index: RNA_INDEX, id: params.data.id });
    const data = { _id: response.body._id, ...response.body._source };
    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    if (error.statusCode === 404) return res.status(404).send({ ok: false, code: NOT_FOUND });
    next(error);
  }
});

export default router;
