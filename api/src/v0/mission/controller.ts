import { NextFunction, Response, Router } from "express";
import mongoose from "mongoose";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../../config";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../../error";
import MissionModel from "../../models/mission";
import OrganizationExclusionModel from "../../models/organization-exclusion";
import RequestModel from "../../models/request";
import { Mission, Publisher } from "../../types";
import { PublisherRequest } from "../../types/passport";
import { diacriticSensitiveRegex, getDistanceFromLatLonInKm, getDistanceKm } from "../../utils";
import { MISSION_FIELDS, NO_PARTNER, NO_PARTNER_MESSAGE } from "./constants";
import { buildData } from "./transformer";
import { buildArrayQuery, buildDateQuery, findMissionTemp, nearSphereToGeoWithin } from "./utils";

export const missionQuerySchema = zod.object({
  activity: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  city: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  clientId: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  country: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  createdAt: zod.string().optional(),
  departmentName: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  distance: zod.string().optional(),
  domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  keywords: zod.string().optional(),
  limit: zod.coerce.number().min(0).max(10000).default(25),
  lat: zod.coerce.number().optional(),
  lon: zod.coerce.number().optional(),
  openToMinors: zod.string().optional(), // TODO: put enum
  organizationRNA: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  organizationStatusJuridique: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  publisher: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  remote: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  reducedMobilityAccessible: zod.string().optional(), // TODO: put enum
  skip: zod.coerce.number().min(0).default(0),
  startAt: zod.string().optional(),
  type: zod.union([zod.string(), zod.array(zod.string())]).optional(),
});

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
      route: `/v0/mission${req.route.path}`,
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

router.get("/", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Publisher;

    const query = missionQuerySchema.passthrough().safeParse(req.query);

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    if (!user.publishers || !user.publishers.length) {
      res.locals = { code: NO_PARTNER, message: NO_PARTNER_MESSAGE };
      return res.status(400).send({ ok: false, code: NO_PARTNER, message: NO_PARTNER_MESSAGE });
    }

    const where = {
      statusCode: "ACCEPTED",
      deletedAt: null,
    } as { [key: string]: any };

    // Exclude organizations from other publishers
    const organizationExclusions = await OrganizationExclusionModel.find({
      excludedForPublisherId: user._id.toString(),
    });
    if (organizationExclusions.length) {
      where.organizationClientId = {
        $nin: organizationExclusions.map((e) => e.organizationClientId),
      };
    }

    if (query.data.publisher) {
      if (!Array.isArray(query.data.publisher) && query.data.publisher.includes(",")) {
        query.data.publisher = query.data.publisher.split(",").map((e: string) => e.trim());
      } else if (!Array.isArray(query.data.publisher)) {
        query.data.publisher = [query.data.publisher.trim()];
      } else {
        query.data.publisher = query.data.publisher.map((e: string) => e.trim());
      }

      query.data.publisher = query.data.publisher.filter((e: string) => user.publishers.some((p: { publisherId: string }) => p.publisherId === e));
      where.publisherId = { $in: query.data.publisher };
    } else {
      where.publisherId = { $in: user.publishers.map((e: { publisherId: string }) => e.publisherId) };
    }
    if (user.moderator) {
      where[`moderation_${user._id}_status`] = "ACCEPTED";
    }
    // Special case for Bouygues Telecom
    if (user._id.toString() === PUBLISHER_IDS.BOUYGUES_TELECOM) {
      where.organizationName = {
        $ne: "APF France handicap - Délégations de Haute-Saône et du Territoire de Belfort",
      };
    }

    if (query.data.activity) {
      where.activity = buildArrayQuery(query.data.activity);
    }
    if (query.data.city) {
      where["addresses.city"] = buildArrayQuery(query.data.city);
    }
    if (query.data.clientId) {
      where.clientId = buildArrayQuery(query.data.clientId);
    }
    if (query.data.country) {
      where["addresses.country"] = buildArrayQuery(query.data.country);
    }
    if (query.data.createdAt) {
      where.createdAt = buildDateQuery(query.data.createdAt);
    }
    if (query.data.departmentName) {
      where["addresses.departmentName"] = buildArrayQuery(query.data.departmentName);
    }
    if (query.data.domain) {
      where.domain = buildArrayQuery(query.data.domain);
    }
    if (query.data.keywords) {
      const regex = diacriticSensitiveRegex(query.data.keywords);
      where.$or = [
        { title: { $regex: regex, $options: "i" } },
        { organizationName: { $regex: regex, $options: "i" } },
        { publisherName: { $regex: regex, $options: "i" } },
        { city: { $regex: regex, $options: "i" } },
      ];
    }
    if (query.data.organizationRNA) {
      where.organizationRNA = buildArrayQuery(query.data.organizationRNA);
    }
    if (query.data.organizationStatusJuridique) {
      where.organizationStatusJuridique = buildArrayQuery(query.data.organizationStatusJuridique);
    }
    if (query.data.openToMinors) {
      where.openToMinors = query.data.openToMinors;
    }
    if (query.data.reducedMobilityAccessible) {
      where.reducedMobilityAccessible = query.data.reducedMobilityAccessible;
    }
    if (query.data.remote) {
      where.remote = buildArrayQuery(query.data.remote);
    }
    if (query.data.startAt) {
      where.startAt = buildDateQuery(query.data.startAt);
    }
    if (query.data.type) {
      where.type = buildArrayQuery(query.data.type);
    }

    // Clean old query params
    if (req.query.size && query.data.limit === 10000) {
      query.data.limit = parseInt(req.query.size as string, 10);
    }
    if (req.query.from && query.data.skip === 0) {
      query.data.skip = parseInt(req.query.from as string, 10);
    }

    const pipeline: any[] = [];

    if (query.data.lat && query.data.lon) {
      if (query.data.distance && (query.data.distance === "0" || query.data.distance === "0km")) {
        query.data.distance = "10km";
      }
      const distanceKm = getDistanceKm(query.data.distance || "50km");
      pipeline.push({
        $geoNear: {
          near: { type: "Point", coordinates: [query.data.lon, query.data.lat] },
          distanceField: "distance",
          key: "addresses.geoPoint",
          maxDistance: distanceKm * 1000,
          query: where,
          spherical: true,
        },
      });
    } else {
      pipeline.push({ $match: where });
    }

    if (!(query.data.lat && query.data.lon)) {
      pipeline.push({ $sort: { startAt: -1 } });
    }

    // Use MISSION_FIELDS to select only used fields
    const projection: Record<string, any> = {};
    MISSION_FIELDS.forEach((field) => {
      projection[field] = 1;
    });
    pipeline.push({ $project: projection });
    pipeline.push({
      $facet: {
        data: [{ $skip: query.data.skip }, { $limit: query.data.limit }],
        total: [{ $count: "count" }],
      },
    });

    const results = await MissionModel.aggregate(pipeline);

    const data = results[0].data;
    const total = results[0].total.length > 0 ? results[0].total[0].count : 0;

    res.locals = { total };
    return res.status(200).send({
      ok: true,
      total,
      data: data.map((e: Mission) => buildData(e, user._id.toString(), user.moderator)),
      limit: query.data.limit,
      skip: query.data.skip,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/search", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Publisher;

    const query = missionQuerySchema
      .extend({
        text: zod.string().optional(), // Legacy text param, not documented anymore
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    if (!user.publishers || !user.publishers.length) {
      res.locals = { code: NO_PARTNER, message: NO_PARTNER_MESSAGE };
      return res.status(400).send({ ok: false, code: NO_PARTNER, message: NO_PARTNER_MESSAGE });
    }

    const where = {
      statusCode: "ACCEPTED",
      deletedAt: null,
    } as { [key: string]: any };

    const organizationExclusions = await OrganizationExclusionModel.find({
      excludedForPublisherId: user._id.toString(),
    });
    if (organizationExclusions.length) {
      where.organizationClientId = {
        $nin: organizationExclusions.map((e) => e.organizationClientId),
      };
    }

    if (query.data.publisher) {
      if (!Array.isArray(query.data.publisher) && query.data.publisher.includes(",")) {
        query.data.publisher = query.data.publisher.split(",").map((e: string) => e.trim());
      } else if (!Array.isArray(query.data.publisher)) {
        query.data.publisher = [query.data.publisher.trim()];
      } else {
        query.data.publisher = query.data.publisher.map((e: string) => e.trim());
      }

      query.data.publisher = query.data.publisher.filter((e: string) => user.publishers.some((p: { publisherId: string }) => p.publisherId === e));
      where.publisherId = { $in: query.data.publisher };
    } else {
      where.publisherId = { $in: user.publishers.map((e: { publisherId: string }) => e.publisherId) };
    }
    if (user.moderator) {
      where[`moderation_${user._id}_status`] = "ACCEPTED";
    }

    if (query.data.activity) {
      where.activity = buildArrayQuery(query.data.activity);
    }
    if (query.data.city) {
      where["addresses.city"] = buildArrayQuery(query.data.city);
    }
    if (query.data.clientId) {
      where.organizationClientId = buildArrayQuery(query.data.clientId);
    }
    if (query.data.country) {
      where["addresses.country"] = buildArrayQuery(query.data.country);
    }
    if (query.data.createdAt) {
      where.createdAt = buildDateQuery(query.data.createdAt);
    }
    if (query.data.departmentName) {
      where["addresses.departmentName"] = buildArrayQuery(query.data.departmentName);
    }
    if (query.data.domain) {
      where.domain = buildArrayQuery(query.data.domain);
    }

    if (query.data.keywords) {
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        {
          organizationName: {
            $regex: diacriticSensitiveRegex(query.data.keywords),
            $options: "i",
          },
        },
        {
          publisherName: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" },
        },
        { city: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
      ];
    }
    if (query.data.organizationRNA) {
      where.organizationRNA = buildArrayQuery(query.data.organizationRNA);
    }
    if (query.data.organizationStatusJuridique) {
      where.organizationStatusJuridique = buildArrayQuery(query.data.organizationStatusJuridique);
    }
    if (query.data.openToMinors) {
      where.openToMinors = query.data.openToMinors;
    }
    if (query.data.reducedMobilityAccessible) {
      where.reducedMobilityAccessible = query.data.reducedMobilityAccessible;
    }
    if (query.data.remote) {
      where.remote = buildArrayQuery(query.data.remote);
    }
    if (query.data.startAt) {
      where.startAt = buildDateQuery(query.data.startAt);
    }
    if (query.data.type) {
      where.type = buildArrayQuery(query.data.type);
    }
    // Old search
    if (query.data.text) {
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
        { organizationName: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
        { publisherName: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
        { city: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
      ];
    }
    if (query.data.type) {
      where.type = buildArrayQuery(query.data.type);
    }

    if (query.data.lat && query.data.lon) {
      if (query.data.distance && (query.data.distance === "0" || query.data.distance === "0km")) {
        query.data.distance = "10km";
      }
      const distanceKm = getDistanceKm(query.data.distance || "50km");
      where["addresses.geoPoint"] = {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [query.data.lon, query.data.lat] },
          $maxDistance: distanceKm * 1000,
        },
      };
    }

    // Clean old query params
    if (req.query.size && query.data.limit === 10000) {
      query.data.limit = parseInt(req.query.size as string, 10);
    }
    if (req.query.from && query.data.skip === 0) {
      query.data.skip = parseInt(req.query.from as string, 10);
    }

    const projection: Record<string, any> = {};
    MISSION_FIELDS.forEach((field) => {
      projection[field] = 1;
    });

    const whereForFacets = { ...where };
    if (whereForFacets["addresses.geoPoint"]) {
      whereForFacets["addresses.geoPoint"] = nearSphereToGeoWithin(whereForFacets["addresses.geoPoint"].$nearSphere);
    }

    const aggregation: any[] = [];
    aggregation.push({ $match: whereForFacets });
    aggregation.push({
      $facet: {
        data: [{ $skip: query.data.skip }, { $limit: query.data.limit }, { $project: projection }],
        metadata: [{ $count: "total" }],
        domain: [{ $group: { _id: "$domain", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        activity: [{ $group: { _id: "$activity", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        departmentName: [{ $group: { _id: "$departmentName", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
      },
    });

    const [results] = await MissionModel.aggregate(aggregation);
    const data = results.data;
    const total = results.metadata[0]?.total || 0;

    res.locals = { total };
    return res.status(200).send({
      ok: true,
      total,
      hits: data.map((e: Mission) => ({
        ...buildData(e, user._id.toString(), user.moderator),
        _distance: getDistanceFromLatLonInKm(query.data.lat, query.data.lon, e.addresses[0]?.location?.lat, e.addresses[0]?.location?.lon),
      })),
      facets: {
        departmentName: results.departmentName.map((b: { _id: string; count: number }) => ({
          key: b._id,
          doc_count: b.count,
        })),
        activities: results.activity.map((b: { _id: string; count: number }) => ({
          key: b._id,
          doc_count: b.count,
        })),
        domains: results.domain.map((b: { _id: string; count: number }) => ({
          key: b._id,
          doc_count: b.count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Publisher;

    const params = zod
      .object({
        id: zod.string().refine((val) => {
          return mongoose.Types.ObjectId.isValid(val)
        }),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    // const mission = await MissionModel.findOne({ _id: params.data.id });
    // TODO: temporary hack: still used?
    const mission = await findMissionTemp(params.data.id);
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    res.locals = { total: 1 };
    return res.status(200).send({ ok: true, data: buildData(mission, user._id.toString(), user.moderator) });
  } catch (error: any) {
    next(error);
  }
});

export default router;
