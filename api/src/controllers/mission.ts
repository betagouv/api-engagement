import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import { UserRequest } from "../types/passport";
import { EARTH_RADIUS, buildQueryMongo, diacriticSensitiveRegex, getDistanceKm } from "../utils";

const router = Router();

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        status: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        comment: zod.string().optional(),
        type: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        publisherId: zod.string().optional(),
        domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        organization: zod.string().optional(),
        activity: zod.string().optional(),
        city: zod.string().optional(),
        department: zod.string().optional(),
        search: zod.string().optional(),
        availableFrom: zod.coerce.date().optional(),
        availableTo: zod.coerce.date().optional(),
        size: zod.coerce.number().int().min(0).default(25),
        from: zod.coerce.number().int().min(0).default(0),
        sort: zod.string().optional(),

        publishers: zod.array(zod.string()).optional(),
        jvaModeration: zod.boolean().optional(),
        lat: zod.coerce.number().min(-90).max(90).optional(),
        lon: zod.coerce.number().min(-180).max(180).optional(),
        location: zod.string().optional(),
        distance: zod.string().optional(),
        rules: zod
          .array(
            zod.object({
              field: zod.string(),
              operator: zod.string(),
              value: zod.string(),
              combinator: zod.string(),
            })
          )
          .optional(),
        leboncoinStatus: zod.string().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const where = {} as { [key: string]: any };

    if (body.data.lat && body.data.lon) {
      const distance = getDistanceKm(body.data.distance && body.data.distance !== "Aucun" ? body.data.distance : "25km");
      where.geoPoint = {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [body.data.lon, body.data.lat],
          },
          $maxDistance: distance * 1000,
        },
      };
    }

    if (body.data.rules && body.data.rules.length > 0) {
      const rulesQuery = buildQueryMongo(body.data.rules as any);

      if (rulesQuery.$and.length > 0) {
        where.$and = [...(where.$and || []), ...rulesQuery.$and];
      }
      if (rulesQuery.$or.length > 0) {
        where.$or = [...(where.$or || []), ...rulesQuery.$or];
      }
    }

    if (body.data.type) {
      where.type = body.data.type;
    }

    if (body.data.publisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.publisherId)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN });
      } else {
        where.publisherId = body.data.publisherId;
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    if (body.data.status === "none") {
      where.$or = [{ statusCode: "" }, { statusCode: null }];
    } else if (body.data.status) {
      if (Array.isArray(body.data.status)) {
        where.statusCode = { $in: body.data.status };
      } else {
        where.statusCode = body.data.status;
      }
    }
    if (body.data.comment) {
      where.statusComment = body.data.comment;
    }

    if (body.data.leboncoinStatus === "none") {
      where.$or = [{ leboncoinStatus: "" }, { leboncoinStatus: null }];
    } else if (body.data.leboncoinStatus) {
      where.leboncoinStatus = body.data.leboncoinStatus;
    }

    if (body.data.domain === "none") {
      where.$or = [{ domain: "" }, { domain: null }];
    } else if (body.data.domain) {
      if (Array.isArray(body.data.domain)) {
        where.domain = { $in: body.data.domain };
      } else {
        where.domain = body.data.domain;
      }
    }

    if (body.data.organization === "none") {
      where.$or = [{ organizationName: "" }, { organizationName: null }];
    } else if (body.data.organization) {
      where.organizationName = body.data.organization;
    }

    if (body.data.activity === "none") {
      where.$or = [{ activity: "" }, { activity: null }];
    } else if (body.data.activity) {
      where.activity = body.data.activity;
    }

    if (body.data.city === "none") {
      where.$or = [{ city: "" }, { city: null }];
    } else if (body.data.city) {
      where.city = body.data.city;
    }

    if (body.data.department === "none") {
      where.$or = [{ departmentName: "" }, { departmentName: null }];
    } else if (body.data.department) {
      where.departmentName = body.data.department;
    }

    if (body.data.search) {
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(body.data.search), $options: "i" } },
        {
          organizationName: { $regex: diacriticSensitiveRegex(body.data.search), $options: "i" },
        },
      ];
    }

    if (body.data.availableFrom) {
      where.$or = [{ deletedAt: { $gte: body.data.availableFrom } }, { deleted: false }];
    }

    if (body.data.availableTo) {
      where.createdAt = { $lte: body.data.availableTo };
    }

    if (!body.data.availableFrom && !body.data.availableTo) {
      where.deleted = false;
    }

    if (body.data.publishers) {
      where.publisherId = { $in: body.data.publishers };
    }

    if (body.data.jvaModeration) {
      where.$or = [{ publisherId: PUBLISHER_IDS.JEVEUXAIDER }, { [`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`]: "ACCEPTED" }];
    }

    const whereAggs = { ...where };
    if (whereAggs.geoPoint) {
      whereAggs.geoPoint = {
        $geoWithin: {
          $centerSphere: [
            [Number(body.data.lon), Number(body.data.lat)],
            body.data.distance && body.data.distance !== "Aucun" ? getDistanceKm(body.data.distance) : getDistanceKm("50km") / EARTH_RADIUS,
          ],
        },
      };
    }

    const total = await MissionModel.countDocuments(whereAggs);

    // Split in another route maybe ? -> faster and more scalable
    const facets = await MissionModel.aggregate([
      { $match: whereAggs },
      {
        $facet: {
          status: [{ $group: { _id: "$statusCode", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          comments: [{ $group: { _id: "$statusComment", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          type: [{ $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          domains: [{ $group: { _id: "$domain", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          organizations: [{ $group: { _id: "$organizationName", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          activities: [{ $group: { _id: "$activity", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          cities: [{ $group: { _id: "$city", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          departments: [{ $group: { _id: "$departmentName", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          partners: [
            {
              $group: {
                _id: "$publisherId",
                publisherName: { $first: "$publisherName" },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          leboncoinStatus: [{ $group: { _id: "$leboncoinStatus", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        },
      },
    ]);

    const aggs = {
      status: facets[0].status.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      comments: facets[0].comments.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      type: facets[0].type.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      domains: facets[0].domains.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      organizations: facets[0].organizations.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      activities: facets[0].activities.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      cities: facets[0].cities.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      departments: facets[0].departments.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      partners: facets[0].partners.map((b: { _id: string; count: number; publisherName: string }) => ({
        _id: b._id,
        count: b.count,
        name: b.publisherName,
        mission_type: b.publisherName === "Service Civique" ? "volontariat" : "benevolat",
      })),
      leboncoinStatus: facets[0].leboncoinStatus.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
    };
    if (body.data.size === 0) {
      return res.status(200).send({ ok: true, data: [], total, aggs });
    }

    const data = await MissionModel.find(where)
      .sort(body.data.sort ? { [body.data.sort]: -1 } : undefined)
      .skip(body.data.from)
      .limit(body.data.size);

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
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const where: { [key: string]: any } = { deleted: false, statusCode: "ACCEPTED" };
    if (query.data.publishers) {
      where.publisherId = { $in: query.data.publishers };
    }

    const aggs = await MissionModel.aggregate([
      { $match: where },
      { $unwind: `$${query.data.field}` },
      { $group: { _id: `$${query.data.field}`, count: { $sum: 1 } } },
      { $match: { _id: { $regex: query.data.search, $options: "i" } } },
      { $sort: { count: -1 } },
      { $limit: 1000 },
    ]);
    return res.status(200).send({
      ok: true,
      data: aggs.map((e: { _id: string; count: number }) => ({
        key: e._id,
        doc_count: e.count,
      })),
    });
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

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const data = await MissionModel.findOne({ _id: params.data.id });
    if (!data) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

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

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    await MissionModel.findOneAndUpdate({ _id: params.data.id }, { deleted: true, deletedAt: new Date() });
    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
