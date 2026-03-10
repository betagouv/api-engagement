import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "@/error";
import { organizationService } from "@/services/organization";
import { OrganizationUpdatePatch } from "@/types/organization";
import { UserRequest } from "@/types/passport";
import { slugify } from "@/utils/string";

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

    const { results, total } = await organizationService.findOrganizationsByFilters({
      department: body.data.department,
      city: body.data.city,
      query: body.data.search,
      offset: body.data.from,
      limit: body.data.size,
      includeTotal: "all",
    });
    return res.status(200).send({ ok: true, data: results, total });
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

    const data = await organizationService.findOneOrganizationById(params.data.id);
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
    const body = zod.object({ name: zod.string().optional(), unnamed: zod.string().optional(), rna: zod.string().optional(), siren: zod.string().optional() }).safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const organization = await organizationService.findOneOrganizationById(params.data.id);
    if (!organization) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const names = new Set(organization.names ?? []);
    let namesChanged = false;

    if (body.data.name) {
      const slug = slugify(body.data.name);
      if (slug && !names.has(slug)) {
        names.add(slug);
        namesChanged = true;
      }
    }
    if (body.data.unnamed) {
      const slug = slugify(body.data.unnamed);
      if (slug && names.delete(slug)) {
        namesChanged = true;
      }
      if (names.size === 0) {
        names.add(slugify(organization.title));
      }
    }

    const patch: OrganizationUpdatePatch = {};

    if (namesChanged) {
      patch.names = Array.from(names);
    }

    if (body.data.rna && body.data.rna !== organization.rna) {
      patch.rna = body.data.rna;
    }
    if (body.data.siren && body.data.siren !== organization.siren) {
      patch.siren = body.data.siren;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(200).send({ ok: true, data: organization });
    }

    const data = await organizationService.updateOrganization(organization.id, patch);

    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    next(error);
  }
});

export default router;
