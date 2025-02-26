import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { API_URL, STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { captureMessage, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import RequestModel from "../models/request";
import { Mission, Stats } from "../types";
import { PublisherRequest } from "../types/passport";
import { diacriticSensitiveRegex, EARTH_RADIUS, getDistanceFromLatLonInKm, getDistanceKm } from "../utils";

const NO_PARTNER = "NO_PARTNER";
const NO_PARTNER_MESSAGE = "Vous n'avez pas encore accès à des missions. Contactez margot.quettelart@beta.gouv.fr pour vous donner accès aux missions";

const router = Router();

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) return;
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
    const query = zod
      .object({
        limit: zod.coerce.number().min(0).max(10000).default(25),
        skip: zod.coerce.number().min(0).default(0),
        keywords: zod.string().optional(),
        country: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        city: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        departmentName: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        remote: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        type: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        publisher: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        clientId: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        organizationRNA: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        organizationStatusJuridique: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        associationId: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        associationRNA: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        createdAt: zod.string().optional(),
        startAt: zod.string().optional(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    if (!req.user.publishers || !req.user.publishers.length) {
      res.locals = { code: NO_PARTNER, message: NO_PARTNER_MESSAGE };
      return res.status(400).send({ ok: false, code: NO_PARTNER, message: NO_PARTNER_MESSAGE });
    }

    // Clean old query params
    if (req.query.size && query.data.limit === 10000) query.data.limit = parseInt(req.query.size as string, 10);
    if (req.query.from && query.data.skip === 0) query.data.skip = parseInt(req.query.from as string, 10);

    const where = {
      statusCode: "ACCEPTED",
      deleted: false,
      organizationName: { $nin: req.user.excludeOrganisations || [] },
    } as { [key: string]: any };

    if (query.data.publisher && req.user.publishers.some((e: { publisher: string }) => e.publisher === query.data.publisher)) {
      if (!Array.isArray(query.data.publisher) && query.data.publisher.includes(",")) query.data.publisher = query.data.publisher.split(",").map((e: string) => e.trim());
      where.publisherId = Array.isArray(query.data.publisher) ? { $in: query.data.publisher } : query.data.publisher;
    } else {
      where.publisherId = { $in: req.user.publishers.map((e: { publisher: string }) => e.publisher) };
    }

    if (query.data.keywords)
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        { organizationName: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        { publisherName: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        { city: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
      ];

    if (query.data.country) {
      if (!Array.isArray(query.data.country) && query.data.country.includes(",")) query.data.country = query.data.country.split(",").map((e: string) => e.trim());
      where["addresses.country"] = Array.isArray(query.data.country) ? { $in: query.data.country } : query.data.country;
    }

    if (query.data.city) {
      if (!Array.isArray(query.data.city) && query.data.city.includes(",")) query.data.city = query.data.city.split(",").map((e: string) => e.trim());
      where["addresses.city"] = Array.isArray(query.data.city) ? { $in: query.data.city } : query.data.city;
    }

    if (query.data.departmentName) {
      if (!Array.isArray(query.data.departmentName) && query.data.departmentName.includes(","))
        query.data.departmentName = query.data.departmentName.split(",").map((e: string) => e.trim());
      where["addresses.departmentName"] = Array.isArray(query.data.departmentName) ? { $in: query.data.departmentName } : query.data.departmentName;
    }
    if (query.data.remote) {
      if (!Array.isArray(query.data.remote) && query.data.remote.includes(",")) query.data.remote = query.data.remote.split(",").map((e: string) => e.trim());
      where.remote = Array.isArray(query.data.remote) ? { $in: query.data.remote } : query.data.remote;
    }
    if (query.data.type) {
      if (!Array.isArray(query.data.type) && query.data.type.includes(",")) query.data.type = query.data.type.split(",").map((e: string) => e.trim());
      where.type = Array.isArray(query.data.type) ? { $in: query.data.type } : query.data.type;
    }
    if (query.data.domain) {
      if (!Array.isArray(query.data.domain) && query.data.domain.includes(",")) query.data.domain = query.data.domain.split(",").map((e: string) => e.trim());
      where.domain = Array.isArray(query.data.domain) ? { $in: query.data.domain } : query.data.domain;
    }
    if (query.data.clientId) {
      if (!Array.isArray(query.data.clientId) && query.data.clientId.includes(",")) query.data.clientId = query.data.clientId.split(",").map((e: string) => e.trim());
      where.clientId = Array.isArray(query.data.clientId) ? { $in: query.data.clientId } : query.data.clientId;
    }

    if (query.data.organizationRNA) {
      if (!Array.isArray(query.data.organizationRNA) && query.data.organizationRNA.includes(","))
        query.data.organizationRNA = query.data.organizationRNA.split(",").map((e: string) => e.trim());
      where.organizationRNA = Array.isArray(query.data.organizationRNA) ? { $in: query.data.organizationRNA } : query.data.organizationRNA;
    }
    if (query.data.organizationStatusJuridique) {
      if (!Array.isArray(query.data.organizationStatusJuridique) && query.data.organizationStatusJuridique.includes(","))
        query.data.organizationStatusJuridique = query.data.organizationStatusJuridique.split(",").map((e: string) => e.trim());
      where.organizationStatusJuridique = Array.isArray(query.data.organizationStatusJuridique)
        ? { $in: query.data.organizationStatusJuridique }
        : query.data.organizationStatusJuridique;
    }
    if (query.data.associationId) {
      if (!Array.isArray(query.data.associationId) && query.data.associationId.includes(","))
        query.data.associationId = query.data.associationId.split(",").map((e: string) => e.trim());
      where.associationId = Array.isArray(query.data.associationId) ? { $in: query.data.associationId } : query.data.associationId;
    }

    if (query.data.associationRNA) {
      if (!Array.isArray(query.data.associationRNA) && query.data.associationRNA.includes(","))
        query.data.associationRNA = query.data.associationRNA.split(",").map((e: string) => e.trim());
      where.associationRNA = Array.isArray(query.data.associationRNA) ? { $in: query.data.associationRNA } : query.data.associationRNA;
    }

    if (req.user.moderator) {
      where[`moderation_${req.user._id}_status`] = "ACCEPTED";
    }

    // Special case for Bouygues Telecom
    if (req.user._id.toString() === "616fefd119fb03075a0b0843") {
      where.organizationName = { $ne: "APF France handicap - Délégations de Haute-Saône et du Territoire de Belfort" };
    }

    const total = await MissionModel.countDocuments(where);
    const data = await MissionModel.find(where).skip(query.data.skip).limit(query.data.limit).lean();

    res.locals = { total };
    return res
      .status(200)
      .send({ ok: true, total, data: data.map((e: Mission) => buildData(e, req.user._id, req.user.moderator)), limit: query.data.limit, skip: query.data.skip });
  } catch (error) {
    next(error);
  }
});

router.get("/search", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        lat: zod.coerce.number().optional(),
        lon: zod.coerce.number().optional(),
        distance: zod.string().optional(),
        openToMinors: zod.string().optional(),
        reducedMobilityAccessible: zod.string().optional(),
        publisher: zod.string().optional(),
        domain: zod.string().optional(),
        remote: zod.string().optional(),
        clientId: zod.string().optional(),
        activity: zod.string().optional(),
        departmentName: zod.string().optional(),
        createdAt: zod.string().optional(),
        startAt: zod.string().optional(),
        text: zod.string().optional(),
        sortBy: zod.string().optional(),
        limit: zod.coerce.number().min(0).max(10000).default(25),
        skip: zod.coerce.number().min(0).default(0),
      })
      .passthrough()
      .safeParse(req.query);

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    // Clean old query params
    if (req.query.size && query.data.limit === 10000) query.data.limit = parseInt(req.query.size as string, 10);
    if (req.query.from && query.data.skip === 0) query.data.skip = parseInt(req.query.from as string, 10);

    if (!req.user.publishers || !req.user.publishers.length) {
      res.locals = { code: NO_PARTNER, message: NO_PARTNER_MESSAGE };
      return res.status(400).send({ ok: false, code: NO_PARTNER, message: NO_PARTNER_MESSAGE });
    }

    const where = {
      statusCode: "ACCEPTED",
      deleted: false,
      organizationName: { $nin: req.user.excludeOrganisations || [] },
    } as { [key: string]: any };

    if (query.data.publisher && req.user.publishers.some((e: { publisher: string }) => e.publisher === query.data.publisher)) {
      where.publisherId = { $in: query.data.publisher.split(",").map((e: string) => e.trim()) };
    } else {
      where.publisherId = { $in: req.user.publishers.map((e: { publisher: string }) => e.publisher) };
    }

    if (query.data.lat && query.data.lon) {
      if (query.data.distance && (query.data.distance === "0" || query.data.distance === "0km")) query.data.distance = "10km";
      where["addresses.geoPoint"] = {
        $geoWithin: {
          $centerSphere: [[query.data.lon, query.data.lat], getDistanceKm(query.data.distance || "50km") / EARTH_RADIUS],
        },
      };
    }

    if (query.data.domain) where.domain = query.data.domain;
    if (query.data.openToMinors) where.openToMinors = query.data.openToMinors;
    if (query.data.reducedMobilityAccessible) where.reducedMobilityAccessible = query.data.reducedMobilityAccessible;
    if (query.data.remote) where.remote = { $in: query.data.remote.split(",") };
    if (query.data.clientId) where.clientId = query.data.clientId;
    if (query.data.activity) where.activity = query.data.activity;
    if (query.data.departmentName) where["addresses.departmentName"] = query.data.departmentName;

    if (query.data.createdAt) {
      if (query.data.createdAt.startsWith("gt:")) where.createdAt = { $gt: new Date(query.data.createdAt.replace("gt:", "")) };
      if (query.data.createdAt.startsWith("lt:")) where.createdAt = { $lt: new Date(query.data.createdAt.replace("lt:", "")) };
    }

    if (query.data.startAt) {
      if (query.data.startAt.startsWith("gt:")) where.startAt = { $gt: new Date(query.data.startAt.replace("gt:", "")) };
      if (query.data.startAt.startsWith("lt:")) where.startAt = { $lt: new Date(query.data.startAt.replace("lt:", "")) };
    }

    if (req.user.moderator) {
      where[`moderation_${req.user._id}_status`] = "ACCEPTED";
    }

    if (query.data.text)
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
        { organizationName: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
        { publisherName: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
        { city: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
      ];

    const data = await MissionModel.find(where).skip(query.data.skip).limit(query.data.limit).lean();

    // countDocument and aggregate does not accept $nearSphere (but keeping $near cause it sorts the results)
    const whereAggs = { ...where };
    if (whereAggs.geoPoint) whereAggs.geoPoint = { $geoWithin: { $centerSphere: [[query.data.lon, query.data.lat], getDistanceKm(query.data.distance || "50km") / EARTH_RADIUS] } };
    const total = await MissionModel.countDocuments(whereAggs);
    const facets = await MissionModel.aggregate([
      { $match: whereAggs },
      {
        $facet: {
          domain: [{ $group: { _id: "$domain", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          activity: [{ $group: { _id: "$activity", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          departmentName: [{ $group: { _id: "$addresses.departmentName", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        },
      },
    ]);

    res.locals = { total };
    return res.status(200).send({
      ok: true,
      total,
      hits: data.map((e: Mission) => ({
        ...buildData(e, req.user._id, req.user.moderator),
        _distance: getDistanceFromLatLonInKm(query.data.lat, query.data.lon, e.location?.lat, e.location?.lon),
      })),
      facets: {
        departmentName: facets[0].departmentName.map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
        activities: facets[0].activity.map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
        domains: facets[0].domain.map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
      },
    });
  } catch (error) {
    next(error);
  }
});

const findMissionTemp = async (missionId: string) => {
  if (!missionId.match(/[^0-9a-fA-F]/) && missionId.length === 24) {
    const mission = await MissionModel.findById(missionId);
    if (mission) return mission;
  }

  const mission = await MissionModel.findOne({ _old_ids: { $in: [missionId] } });
  if (mission) {
    captureMessage("[Temp] Mission found with _old_ids", `mission ${missionId}`);
    return mission;
  }

  const response2 = await esClient.search({ index: STATS_INDEX, body: { query: { term: { "missionId.keyword": missionId } }, size: 1 } });
  if (response2.body.hits.total.value > 0) {
    const stats = { _id: response2.body.hits.hits[0]._id, ...response2.body.hits.hits[0]._source } as Stats;
    const mission = await MissionModel.findOne({ clientId: stats.missionClientId?.toString(), publisherId: stats.toPublisherId });
    if (mission) {
      captureMessage("[Temp] Mission found with click", `mission ${missionId}`);
      return mission;
    }
  }
  return null;
};

router.get("/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    // const mission = await MissionModel.findOne({ _id: params.data.id });
    const mission = await findMissionTemp(params.data.id);
    if (!mission) return res.status(404).send({ ok: false, code: NOT_FOUND });

    res.locals = { total: 1 };
    return res.status(200).send({ ok: true, data: buildData(mission, req.user._id, req.user.moderator) });
  } catch (error: any) {
    next(error);
  }
});

const buildData = (data: Mission, publisherId: string, moderator: boolean = false) => {
  const address = data.addresses[0];
  return {
    _id: data._id,
    id: data._id,
    clientId: data.clientId,
    publisherId: data.publisherId,
    activity: data.activity,
    address: address ? address.street : undefined,
    city: address ? address.city : undefined,
    postalCode: address ? address.postalCode : undefined,
    departmentCode: address ? address.departmentCode : undefined,
    departmentName: address ? address.departmentName : undefined,
    country: address ? address.country : undefined,
    location: address ? address.location : undefined,
    addresses: data.addresses,
    applicationUrl: `${API_URL}/r/${data._id}/${publisherId}`,
    associationLogo: data.associationLogo,
    associationAddress: data.associationAddress,
    associationCity: data.associationCity,
    associationDepartmentCode: data.associationDepartmentCode,
    associationDepartmentName: data.associationDepartmentName,
    associationId: data.associationId,
    associationName: data.associationName,
    associationRNA: data.associationRNA,
    associationPostalCode: data.associationPostalCode,
    associationRegion: data.associationRegion,
    associationReseaux: data.associationReseaux,
    associationSiren: data.associationSiren,
    associationSources: data.associationSources,
    audience: data.audience,
    closeToTransport: data.closeToTransport,
    createdAt: data.createdAt,
    deleted: data.deleted,
    deletedAt: data.deletedAt,
    description: data.description,
    descriptionHtml: data.descriptionHtml,
    domain: data.domain,
    domainLogo: data.domainLogo,
    duration: data.duration,
    endAt: data.endAt,
    lastSyncAt: data.lastSyncAt,
    metadata: data.metadata,
    openToMinors: data.openToMinors,
    organizationActions: data.organizationActions,
    organizationBeneficiaries: data.organizationBeneficiaries,
    organizationCity: data.organizationCity,
    organizationClientId: data.organizationClientId,
    organizationDescription: data.organizationDescription,
    organizationFullAddress: data.organizationFullAddress,
    organizationId: data.organizationId,
    organizationLogo: data.organizationLogo,
    organizationName: data.organizationName,
    organizationPostCode: data.organizationPostCode,
    organizationRNA: data.organizationRNA,
    organizationReseaux: data.organizationReseaux,
    organizationSiren: data.organizationSiren,
    organizationStatusJuridique: data.organizationStatusJuridique,
    organizationType: data.organizationType,
    organizationUrl: data.organizationUrl,
    places: data.places,
    postedAt: data.postedAt,
    priority: data.priority,
    publisherLogo: data.publisherLogo,
    publisherName: data.publisherName,
    publisherUrl: data.publisherUrl,
    reducedMobilityAccessible: data.reducedMobilityAccessible,
    region: data.region,
    remote: data.remote,
    schedule: data.schedule,
    snu: data.snu,
    snuPlaces: data.snuPlaces,
    soft_skills: data.soft_skills,
    startAt: data.startAt,
    statusCode: data.statusCode,
    statusComment: data.statusComment,
    statusCommentHistoric: data.statusCommentHistoric,
    tags: data.tags,
    tasks: data.tasks,
    title: moderator && data[`moderation_${publisherId}_title`] ? data[`moderation_${publisherId}_title`] : data.title,
    type: data.type,
    updatedAt: data.updatedAt,
  };
};

export default router;
