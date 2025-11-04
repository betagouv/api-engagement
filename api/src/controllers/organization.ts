import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import OrganizationModel from "../models/organization";
import { UserRequest } from "../types/passport";
import { slugify } from "../utils/string";

const router = Router();

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        department: zod.string().optional(),
        city: zod.string().optional(),
        search: zod.string().optional(),
        size: zod.number().int().min(1).max(100).default(10),
        from: zod.number().int().min(0).default(0),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: body.error });
    }

    const where = {} as { [key: string]: any };

    if (body.data.department) {
      where.addressDepartmentName = body.data.department;
    }
    if (body.data.city) {
      where.addressCity = body.data.city;
    }
    if (body.data.search) {
      where.$or = [
        { title: { $regex: body.data.search, $options: "i" } },
        { rna: { $regex: body.data.search, $options: "i" } },
        { siret: { $regex: body.data.search, $options: "i" } },
      ];
    }

    const total = await OrganizationModel.estimatedDocumentCount();
    const data = await OrganizationModel.find(where).skip(body.data.from).limit(body.data.size).lean();
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

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const data = await OrganizationModel.findOne({ _id: params.data.id }).lean();
    if (!data) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    next(error);
  }
});

router.put("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod.object({ id: zod.string() }).safeParse(req.params);
    const body = zod.object({ name: zod.string(), rna: zod.string().optional(), siren: zod.string().optional() }).safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const organization = await OrganizationModel.findOne({ _id: params.data.id });
    if (!organization) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    if (body.data.name) {
      const slug = slugify(body.data.name);
      if (!organization.names.includes(slug)) {
        organization.names = [...organization.names, slug];
      }
    }

    if (body.data.rna && body.data.rna !== organization.rna) {
      organization.rna = body.data.rna || null;
    }
    if (body.data.siren && body.data.siren !== organization.siren) {
      organization.siren = body.data.siren || null;
    }

    const data = await organization.save();

    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    next(error);
  }
});

export default router;
