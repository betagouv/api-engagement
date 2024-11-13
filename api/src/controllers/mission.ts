import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import { UserRequest } from "../types/passport";
import { diacriticSensitiveRegex } from "../utils";

const router = Router();

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        status: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        publisherId: zod.string().optional(),
        domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        organization: zod.string().optional(),
        activity: zod.string().optional(),
        city: zod.string().optional(),
        search: zod.string().optional(),
        availableFrom: zod.coerce.date().optional(),
        availableTo: zod.coerce.date().optional(),
        size: zod.coerce.number().int().min(0).default(25),
        from: zod.coerce.number().int().min(0).default(0),
        sort: zod.string().optional(),
      })
      .passthrough()
      .safeParse(req.body);

    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });

    const where = {} as { [key: string]: any };

    if (body.data.publisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.publisherId)) return res.status(403).send({ ok: false, code: FORBIDDEN });
      else where.publisherId = body.data.publisherId;
    } else if (req.user.role !== "admin") return res.status(403).send({ ok: false, code: FORBIDDEN });

    if (body.data.status === "none") where.$or = [{ statusCode: "" }, { statusCode: null }];
    else if (body.data.status) {
      if (Array.isArray(body.data.status)) where.statusCode = { $in: body.data.status };
      else where.statusCode = body.data.status;
    }

    if (body.data.leboncoinStatus === "none") where.$or = [{ leboncoinStatus: "" }, { leboncoinStatus: null }];
    else if (body.data.leboncoinStatus) where.leboncoinStatus = body.data.leboncoinStatus;

    if (body.data.domain === "none") where.$or = [{ domain: "" }, { domain: null }];
    else if (body.data.domain) {
      if (Array.isArray(body.data.domain)) where.domain = { $in: body.data.domain };
      else where.domain = body.data.domain;
    }

    if (body.data.organization === "none") where.$or = [{ organizationName: "" }, { organizationName: null }];
    else if (body.data.organization) where.organizationName = body.data.organization;

    if (body.data.activity === "none") where.$or = [{ activity: "" }, { activity: null }];
    else if (body.data.activity) where.activity = body.data.activity;

    if (body.data.city === "none") where.$or = [{ city: "" }, { city: null }];
    else if (body.data.city) where.city = body.data.city;

    if (body.data.search)
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(body.data.search), $options: "i" } },
        { organizationName: { $regex: diacriticSensitiveRegex(body.data.search), $options: "i" } },
      ];

    if (body.data.availableFrom) {
      // Mission deleted after availableFrom or not deleted
      where.$or = [{ deletedAt: { $gte: body.data.availableFrom } }, { deleted: false }];
    }

    if (body.data.availableTo) {
      // Mission created before availableTo
      where.createdAt = { $lte: body.data.availableTo };
    }

    if (!body.data.availableFrom && !body.data.availableTo) {
      where.deleted = false;
    }

    const total = await MissionModel.countDocuments(where);

    if (body.data.size === 0) return res.status(200).send({ ok: true, data: [], total });

    const data = await MissionModel.find(where)
      .sort(body.data.sort ? { [body.data.sort]: -1 } : undefined)
      .skip(body.data.from)
      .limit(body.data.size);

    const facets = await MissionModel.aggregate([
      { $match: where },
      {
        $facet: {
          status: [{ $group: { _id: "$statusCode", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          domains: [{ $group: { _id: "$domain", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          organizations: [{ $group: { _id: "$organizationName", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          activities: [{ $group: { _id: "$activity", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          cities: [{ $group: { _id: "$city", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          leboncoinStatus: [{ $group: { _id: "$leboncoinStatus", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        },
      },
    ]);

    const aggs = {
      status: facets[0].status.map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
      domains: facets[0].domains.map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
      organizations: facets[0].organizations.map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
      activities: facets[0].activities.map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
      cities: facets[0].cities.map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
      leboncoinStatus: facets[0].leboncoinStatus.map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
    };

    return res.status(200).send({ ok: true, data, total, aggs });
  } catch (error) {
    next(error);
  }
});

router.get("/autocomplete", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publishers: zod.array(zod.string()).optional(),
        field: zod.string(),
        search: zod.string(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });

    const aggs = await MissionModel.aggregate([
      { $match: { deleted: false, statusCode: "ACCEPTED" } },
      { $unwind: `$${query.data.field}` },
      { $group: { _id: `$${query.data.field}`, count: { $sum: 1 } } },
      { $match: { _id: { $regex: query.data.search, $options: "i" } } },
      { $sort: { count: -1 } },
      { $limit: 1000 },
    ]);
    return res.status(200).send({ ok: true, data: aggs.map((e: { _id: string; count: number }) => ({ key: e._id, doc_count: e.count })) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });

    const data = await MissionModel.findOne({ _id: params.data.id });
    if (!data) return res.status(404).send({ ok: false, code: NOT_FOUND });

    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    next(error);
  }
});

router.delete("/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });

    await MissionModel.findOneAndUpdate({ _id: params.data.id }, { deleted: true, deletedAt: new Date() });
    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
