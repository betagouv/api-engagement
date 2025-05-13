import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { API_URL } from "../config";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import RequestModel from "../models/request";
import { Mission } from "../types";
import { PublisherRequest } from "../types/passport";
import { diacriticSensitiveRegex } from "../utils";

const NO_PARTNER = "NO_PARTNER";
const NO_PARTNER_MESSAGE = "Vous n'avez pas encore accès à des missions. Contactez margot.quettelart@beta.gouv.fr pour vous donner accès aux missions";

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
      route: `/v2/mission${req.route.path}`,
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
        keywords: zod.string().optional(),
        tags: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        snu: zod
          .enum(["true", "false"])
          .transform((value) => value === "true")
          .optional(),
        aggs: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        limit: zod.coerce.number().min(0).max(10000).default(25),
        skip: zod.coerce.number().min(0).default(0),
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

    const where = {
      statusCode: "ACCEPTED",
      deleted: false,
      publisherId: { $in: req.user.publishers.map((e: { publisher: string }) => e.publisher) },
    } as { [key: string]: any };

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

    if (query.data.tags) {
      where.tags = Array.isArray(query.data.tags) ? { $in: query.data.tags } : query.data.tags;
    }
    if (query.data.snu) {
      where.snu = true;
    }

    if (req.user.moderator) {
      where[`moderation_${req.user._id}_status`] = "ACCEPTED";
    }

    const $facet = {} as { [key: string]: any };

    if (query.data.aggs) {
      if (Array.isArray(query.data.aggs)) {
        query.data.aggs.forEach((e: string) => ($facet[e] = [{ $group: { _id: `$${e}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }]));
      } else {
        $facet[query.data.aggs] = [{ $group: { _id: `$${query.data.aggs}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }];
      }
    } else {
      $facet.publisherName = [{ $group: { _id: "$publisherName", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
      $facet.statusCode = [{ $group: { _id: "$statusCode", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
      $facet.domain = [{ $group: { _id: "$domain", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
      $facet.activity = [{ $group: { _id: "$activity", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
      $facet.departmentName = [{ $group: { _id: "$addresses.departmentName", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
    }

    const total = await MissionModel.countDocuments(where);
    const data = await MissionModel.find(where).skip(query.data.skip).limit(query.data.limit).lean();
    const aggs = await MissionModel.aggregate([{ $match: where }, { $facet }]);

    const facets = {} as { [key: string]: any };

    Object.keys(aggs[0] || {}).forEach((e) => {
      facets[e] = aggs[0][e].map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      }));
    });

    res.locals = { total };
    return res.status(200).send({
      ok: true,
      total,
      data: data.map((e: Mission) => buildData(e, req.user._id, req.user.moderator)),
      facets,
      skip: query.data.skip,
      limit: query.data.limit,
    });
  } catch (error) {
    next(error);
  }
});

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

    const mission = await MissionModel.findById(params.data.id).lean();
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

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
    clientId: data.clientId,
    publisherId: data.publisherId,
    activity: data.activity,
    address: address ? address.street : undefined,
    city: address ? address.city : undefined,
    postalCode: address ? address.postalCode : undefined,
    departmentCode: address ? address.departmentCode : undefined,
    departmentName: address ? address.departmentName : undefined,
    region: address ? address.region : undefined,
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
