import { NextFunction, Response, Router } from "express";
import zod from "zod";

import passport from "passport";
import { INVALID_QUERY } from "../error";
import { organizationService } from "../services/organization";
import { OrganizationRecord } from "../types/organization";
import { PublisherRequest } from "../types/passport";

const router = Router();

const withLegacyId = (organization: OrganizationRecord) => {
  const { id, ...rest } = organization;
  return { ...rest, _id: id };
};

router.get("/", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        q: zod.string().optional(),
        rna: zod.string().optional(),
        siret: zod.string().optional(),
        limit: zod.coerce.number().min(0).max(100).default(25),
        skip: zod.coerce.number().min(0).default(0),
      })
      .safeParse(req.query);

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const { results, total } = await organizationService.findOrganizationsByFilters({
      query: query.data.q,
      rna: query.data.rna,
      siret: query.data.siret,
      offset: query.data.skip,
      limit: query.data.limit,
      includeTotal: "filtered",
    });

    return res.status(200).send({ ok: true, data: results.map(withLegacyId), total });
  } catch (error) {
    next(error);
  }
});

export default router;
