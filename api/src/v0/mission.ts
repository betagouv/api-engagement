import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { API_URL, STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { captureMessage, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import RequestModel from "../models/request";
import { Mission, Publisher, Stats } from "../types";
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
    const user = req.user as Publisher;

    const query = zod
      .object({
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
      organizationName: { $nin: user.excludeOrganisations || [] }, // TODO: delete later
      organizationClientId: { $nin: user.excludedOrganizations.map((e) => e.organizationClientId) },
    } as { [key: string]: any };

    if (query.data.publisher) {
      if (!Array.isArray(query.data.publisher) && query.data.publisher.includes(",")) query.data.publisher = query.data.publisher.split(",").map((e: string) => e.trim());
      else if (!Array.isArray(query.data.publisher)) query.data.publisher = [query.data.publisher.trim()];
      else query.data.publisher = query.data.publisher.map((e: string) => e.trim());

      query.data.publisher = query.data.publisher.filter((e: string) => user.publishers.some((p: { publisher: string }) => p.publisher === e));
      where.publisherId = { $in: query.data.publisher };
    } else {
      where.publisherId = { $in: user.publishers.map((e: { publisher: string }) => e.publisher) };
    }
    if (user.moderator) where[`moderation_${user._id}_status`] = "ACCEPTED";
    // Special case for Bouygues Telecom
    if (user._id.toString() === "616fefd119fb03075a0b0843") where.organizationName = { $ne: "APF France handicap - Délégations de Haute-Saône et du Territoire de Belfort" };

    if (query.data.activity) where.activity = buildArrayQuery(query.data.activity);
    if (query.data.city) where["addresses.city"] = buildArrayQuery(query.data.city);
    if (query.data.clientId) where.clientId = buildArrayQuery(query.data.clientId);
    if (query.data.country) where["addresses.country"] = buildArrayQuery(query.data.country);
    if (query.data.createdAt) where.createdAt = buildDateQuery(query.data.createdAt);
    if (query.data.departmentName) where["addresses.departmentName"] = buildArrayQuery(query.data.departmentName);
    if (query.data.domain) where.domain = buildArrayQuery(query.data.domain);
    if (query.data.keywords)
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        { organizationName: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        { publisherName: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        { city: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
      ];
    if (query.data.organizationRNA) where.organizationRNA = buildArrayQuery(query.data.organizationRNA);
    if (query.data.organizationStatusJuridique) where.organizationStatusJuridique = buildArrayQuery(query.data.organizationStatusJuridique);
    if (query.data.openToMinors) where.openToMinors = query.data.openToMinors;
    if (query.data.reducedMobilityAccessible) where.reducedMobilityAccessible = query.data.reducedMobilityAccessible;
    if (query.data.remote) where.remote = buildArrayQuery(query.data.remote);
    if (query.data.startAt) where.startAt = buildDateQuery(query.data.startAt);
    if (query.data.type) where.type = buildArrayQuery(query.data.type);

    if (query.data.lat && query.data.lon) {
      if (query.data.distance && (query.data.distance === "0" || query.data.distance === "0km")) query.data.distance = "10km";
      const distanceKm = getDistanceKm(query.data.distance || "50km");
      where["addresses.geoPoint"] = {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [query.data.lon, query.data.lat] },
          $maxDistance: distanceKm * 1000,
        },
      };
    }

    // Clean old query params
    if (req.query.size && query.data.limit === 10000) query.data.limit = parseInt(req.query.size as string, 10);
    if (req.query.from && query.data.skip === 0) query.data.skip = parseInt(req.query.from as string, 10);

    const data = await MissionModel.find(where).skip(query.data.skip).limit(query.data.limit).lean();

    if (where["addresses.geoPoint"]) where["addresses.geoPoint"] = nearSphereToGeoWithin(where["addresses.geoPoint"].$nearSphere);
    const total = await MissionModel.countDocuments(where);

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
    const user = req.user as Publisher;

    const query = zod
      .object({
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
        text: zod.string().optional(),
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
      organizationName: { $nin: user.excludeOrganisations || [] },
      organizationClientId: { $nin: user.excludedOrganizations.map((e) => e.organizationClientId) },
    } as { [key: string]: any };

    if (query.data.publisher) {
      if (!Array.isArray(query.data.publisher) && query.data.publisher.includes(",")) query.data.publisher = query.data.publisher.split(",").map((e: string) => e.trim());
      else if (!Array.isArray(query.data.publisher)) query.data.publisher = [query.data.publisher.trim()];
      else query.data.publisher = query.data.publisher.map((e: string) => e.trim());

      query.data.publisher = query.data.publisher.filter((e: string) => user.publishers.some((p: { publisher: string }) => p.publisher === e));
      where.publisherId = { $in: query.data.publisher };
    } else {
      where.publisherId = { $in: user.publishers.map((e: { publisher: string }) => e.publisher) };
    }
    if (user.moderator) where[`moderation_${user._id}_status`] = "ACCEPTED";

    if (query.data.activity) where.activity = buildArrayQuery(query.data.activity);
    if (query.data.city) where["addresses.city"] = buildArrayQuery(query.data.city);
    if (query.data.clientId) where.clientId = buildArrayQuery(query.data.clientId);
    if (query.data.country) where["addresses.country"] = buildArrayQuery(query.data.country);
    if (query.data.createdAt) where.createdAt = buildDateQuery(query.data.createdAt);
    if (query.data.departmentName) where["addresses.departmentName"] = buildArrayQuery(query.data.departmentName);
    if (query.data.domain) where.domain = buildArrayQuery(query.data.domain);

    if (query.data.keywords)
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        { organizationName: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        { publisherName: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
        { city: { $regex: diacriticSensitiveRegex(query.data.keywords), $options: "i" } },
      ];
    if (query.data.organizationRNA) where.organizationRNA = buildArrayQuery(query.data.organizationRNA);
    if (query.data.organizationStatusJuridique) where.organizationStatusJuridique = buildArrayQuery(query.data.organizationStatusJuridique);
    if (query.data.openToMinors) where.openToMinors = query.data.openToMinors;
    if (query.data.reducedMobilityAccessible) where.reducedMobilityAccessible = query.data.reducedMobilityAccessible;
    if (query.data.remote) where.remote = buildArrayQuery(query.data.remote);
    if (query.data.startAt) where.startAt = buildDateQuery(query.data.startAt);
    // Old search
    if (query.data.text)
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
        { organizationName: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
        { publisherName: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
        { city: { $regex: diacriticSensitiveRegex(query.data.text), $options: "i" } },
      ];
    if (query.data.type) where.type = buildArrayQuery(query.data.type);

    if (query.data.lat && query.data.lon) {
      if (query.data.distance && (query.data.distance === "0" || query.data.distance === "0km")) query.data.distance = "10km";
      const distanceKm = getDistanceKm(query.data.distance || "50km");
      where["addresses.geoPoint"] = {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [query.data.lon, query.data.lat] },
          $maxDistance: distanceKm * 1000,
        },
      };
    }

    // Clean old query params
    if (req.query.size && query.data.limit === 10000) query.data.limit = parseInt(req.query.size as string, 10);
    if (req.query.from && query.data.skip === 0) query.data.skip = parseInt(req.query.from as string, 10);

    const data = await MissionModel.find(where).skip(query.data.skip).limit(query.data.limit).lean();

    // countDocument and aggregate does not accept $nearSphere (but keeping $near cause it sorts the results)
    if (where["addresses.geoPoint"]) where["addresses.geoPoint"] = nearSphereToGeoWithin(where["addresses.geoPoint"].$nearSphere);
    const total = await MissionModel.countDocuments(where);
    const facets = await MissionModel.aggregate([
      { $match: where },
      {
        $facet: {
          domain: [{ $group: { _id: "$domain", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          activity: [{ $group: { _id: "$activity", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          departmentName: [{ $group: { _id: "$departmentName", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        },
      },
    ]);

    res.locals = { total };
    return res.status(200).send({
      ok: true,
      total,
      hits: data.map((e: Mission) => ({
        ...buildData(e, user._id.toString(), user.moderator),
        _distance: getDistanceFromLatLonInKm(query.data.lat, query.data.lon, e.addresses[0]?.location?.lat, e.addresses[0]?.location?.lon),
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
    const user = req.user as Publisher;

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
    return res.status(200).send({ ok: true, data: buildData(mission, user._id.toString(), user.moderator) });
  } catch (error: any) {
    next(error);
  }
});

const buildArrayQuery = (query: string | string[]) => {
  if (!Array.isArray(query) && query.includes(",")) query = query.split(",").map((e: string) => e.trim());
  return Array.isArray(query) ? { $in: query } : query;
};

const buildDateQuery = (query: string) => {
  try {
    const operation = query.slice(0, 3);
    const date = query.slice(3);
    if (!date) return undefined;
    if (isNaN(new Date(date).getTime())) return undefined;
    return { [operation === "gt:" ? "$gt" : "$lt"]: new Date(date) };
  } catch (error) {
    return undefined;
  }
};

// Convert $nearSphere to $geoWithin (doesn't work with countDocuments)
const nearSphereToGeoWithin = (nearSphere: any) => {
  if (!nearSphere) return;
  const distanceKm = nearSphere.$maxDistance / 1000;
  const geoWithin = { $geoWithin: { $centerSphere: [[nearSphere.$geometry.coordinates[0], nearSphere.$geometry.coordinates[1]], distanceKm / EARTH_RADIUS] } };
  return geoWithin;
};

const buildData = (data: Mission, publisherId: string, moderator: boolean = false) => {
  const address = data.addresses[0];
  return {
    _id: data._id,
    id: data._id,
    clientId: data.clientId,
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

    organizationVerificationStatus: data.organizationVerificationStatus,
    organisationIsRUP: data.organisationIsRUP,
    organizationNameVerified: data.organizationNameVerified,
    organizationRNAVerified: data.organizationRNAVerified,
    organizationSirenVerified: data.organizationSirenVerified,
    organizationSiretVerified: data.organizationSiretVerified,
    organizationAddressVerified: data.organizationAddressVerified,
    organizationCityVerified: data.organizationCityVerified,
    organizationPostalCodeVerified: data.organizationPostalCodeVerified,
    organizationDepartmentCodeVerified: data.organizationDepartmentCodeVerified,
    organizationDepartmentNameVerified: data.organizationDepartmentNameVerified,
    organizationRegionVerified: data.organizationRegionVerified,

    places: data.places,
    postedAt: data.postedAt,
    priority: data.priority,
    publisherId: data.publisherId,
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
    softSkills: data.softSkills,
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
