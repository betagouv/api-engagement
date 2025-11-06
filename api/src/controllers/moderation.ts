import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import { logModeration } from "../services/log";
import { publisherService } from "../services/publisher";
import { Mission } from "../types";
import { UserRequest } from "../types/passport";
import { diacriticSensitiveRegex } from "../utils";

const router = Router();

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        status: zod.enum(["ACCEPTED", "REFUSED", "PENDING", "ONGOING", ""]).optional(),
        publisherId: zod.string().optional(),
        moderatorId: zod.string().default(PUBLISHER_IDS.JEVEUXAIDER),
        comment: zod.string().nullable().optional(),
        domain: zod.string().nullable().optional(),
        city: zod.string().nullable().optional(),
        department: zod.string().nullable().optional(),
        organizationName: zod.string().nullable().optional(),
        organizationClientId: zod.string().nullable().optional(),
        search: zod.string().nullable().optional(),
        activity: zod.string().nullable().optional(),
        size: zod.coerce.number().min(0).default(25),
        from: zod.coerce.number().int().min(0).default(0),
        sort: zod.enum(["asc", "desc", ""]).nullable().optional(),
        organizationRNAVerified: zod.union([zod.string(), zod.object({ $ne: zod.string() })]).optional(),
        organizationSirenVerified: zod.union([zod.string(), zod.object({ $ne: zod.string() })]).optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: body.error });
    }

    if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.publisherId) && !req.user.publishers.includes(body.data.moderatorId)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const moderator = await publisherService.getPublisherById(body.data.moderatorId);
    if (!moderator || !moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const where = {
      deletedAt: null,
      statusCode: "ACCEPTED",
      [`moderation_${body.data.moderatorId}_status`]: { $exists: true },
    } as any;

    if (body.data.status) {
      where[`moderation_${body.data.moderatorId}_status`] = body.data.status;
    }
    if (body.data.comment) {
      where[`moderation_${body.data.moderatorId}_comment`] = body.data.comment;
    }
    if (body.data.publisherId) {
      where.publisherId = body.data.publisherId;
    } else {
      where.publisherId = { $in: moderator.publishers.map((p) => p.diffuseurPublisherId) };
    }
    if (body.data.organizationName === "none") {
      where.$or = [{ organizationName: "" }, { organizationName: null }];
    } else if (body.data.organizationName) {
      where.organizationName = body.data.organizationName;
    }
    if (body.data.organizationClientId) {
      where.organizationClientId = body.data.organizationClientId;
    }

    if (body.data.domain === "none") {
      where.$or = [{ domain: "" }, { domain: null }];
    } else if (body.data.domain) {
      where.domain = body.data.domain;
    }

    if (body.data.department === "none") {
      where.$or = [{ departmentCode: "" }, { departmentCode: null }];
    } else if (body.data.department) {
      where.departmentCode = body.data.department;
    }

    if (body.data.city === "none") {
      where.$or = [{ city: "" }, { city: null }];
    } else if (body.data.city) {
      where.city = body.data.city;
    }

    if (body.data.activity === "none") {
      where.$or = [{ activity: "" }, { activity: null }];
    } else if (body.data.activity) {
      where.activity = body.data.activity;
    }
    if (body.data.search) {
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(body.data.search), $options: "i" } },
        {
          organizationName: { $regex: diacriticSensitiveRegex(body.data.search), $options: "i" },
        },
        {
          [`moderation_${body.data.moderatorId}_title`]: {
            $regex: diacriticSensitiveRegex(body.data.search),
            $options: "i",
          },
        },
      ];
    }

    if (body.data.organizationRNAVerified && body.data.organizationSirenVerified) {
      where.$or = [{ organizationRNAVerified: body.data.organizationRNAVerified }, { organizationSirenVerified: body.data.organizationSirenVerified }];
    } else if (body.data.organizationRNAVerified) {
      where.organizationRNAVerified = body.data.organizationRNAVerified;
    } else if (body.data.organizationSirenVerified) {
      where.organizationSirenVerified = body.data.organizationSirenVerified;
    }

    const total = await MissionModel.countDocuments(where);
    if (body.data.size === 0) {
      return res.status(200).send({ ok: true, data: [], total });
    }

    const data = await MissionModel.find(where)
      .sort({ postedAt: body.data.sort === "asc" ? 1 : -1 })
      .limit(body.data.size)
      .skip(body.data.from);

    return res.status(200).send({
      ok: true,
      data: data.map((h: Mission) => buildData(h, body.data.moderatorId)),
      total,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/aggs", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        status: zod.enum(["ACCEPTED", "REFUSED", "PENDING", "ONGOING", ""]).optional(),
        publisherId: zod.string().optional(),
        moderatorId: zod.string().default(PUBLISHER_IDS.JEVEUXAIDER),
        comment: zod.string().nullable().optional(),
        domain: zod.string().nullable().optional(),
        city: zod.string().nullable().optional(),
        department: zod.string().nullable().optional(),
        organization: zod.string().nullable().optional(),
        search: zod.string().nullable().optional(),
        activity: zod.string().nullable().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: body.error });
    }

    if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.publisherId) && !req.user.publishers.includes(body.data.moderatorId)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const moderator = await publisherService.getPublisherById(body.data.moderatorId);
    if (!moderator || !moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const where = {
      deleted: false,
      statusCode: "ACCEPTED",
      [`moderation_${body.data.moderatorId}_status`]: { $ne: null },
    } as any;

    if (body.data.status) {
      where[`moderation_${body.data.moderatorId}_status`] = body.data.status;
    }
    if (body.data.comment) {
      where[`moderation_${body.data.moderatorId}_comment`] = body.data.comment;
    }
    if (body.data.publisherId) {
      where.publisherId = body.data.publisherId;
    } else {
      where.publisherId = { $in: moderator.publishers.map((p) => p.diffuseurPublisherId) };
    }
    if (body.data.organization === "none") {
      where.$or = [{ organizationName: "" }, { organizationName: null }];
    } else if (body.data.organization) {
      where.organizationName = body.data.organization;
    }

    if (body.data.domain === "none") {
      where.$or = [{ domain: "" }, { domain: null }];
    } else if (body.data.domain) {
      where.domain = body.data.domain;
    }

    if (body.data.department === "none") {
      where.$or = [{ departmentCode: "" }, { departmentCode: null }];
    } else if (body.data.department) {
      where.departmentCode = body.data.department;
    }

    if (body.data.city === "none") {
      where.$or = [{ city: "" }, { city: null }];
    } else if (body.data.city) {
      where.city = body.data.city;
    }

    if (body.data.activity === "none") {
      where.$or = [{ activity: "" }, { activity: null }];
    } else if (body.data.activity) {
      where.activity = body.data.activity;
    }
    if (body.data.search) {
      where.$or = [
        { title: { $regex: diacriticSensitiveRegex(body.data.search), $options: "i" } },
        {
          organizationName: { $regex: diacriticSensitiveRegex(body.data.search), $options: "i" },
        },
        {
          [`moderation_${body.data.moderatorId}_title`]: {
            $regex: diacriticSensitiveRegex(body.data.search),
            $options: "i",
          },
        },
      ];
    }

    const facets = await MissionModel.aggregate([
      { $match: where },
      {
        $facet: {
          status: [
            {
              $group: { _id: `$moderation_${body.data.moderatorId}_status`, count: { $sum: 1 } },
            },
            { $sort: { count: -1 } },
          ],
          comments: [
            {
              $group: { _id: `$moderation_${body.data.moderatorId}_comment`, count: { $sum: 1 } },
            },
            { $sort: { count: -1 } },
          ],
          publishers: [{ $group: { _id: "$publisherId", count: { $sum: 1 } } }, { $limit: 200 }, { $sort: { count: -1 } }],
          activities: [{ $group: { _id: "$activity", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          domains: [{ $group: { _id: "$domain", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          departments: [{ $group: { _id: "$departmentCode", count: { $sum: 1 } } }, { $limit: 101 }, { $sort: { count: -1 } }],
          cities: [{ $group: { _id: "$city", count: { $sum: 1 } } }, { $limit: 100 }, { $sort: { count: -1 } }],
          organization: [{ $group: { _id: "$organizationName", count: { $sum: 1 } } }, { $limit: 10000 }, { $sort: { count: -1 } }],
        },
      },
    ]);

    const publishers = await publisherService.findPublishers();

    const data = {
      status: facets[0].status.filter((b: { _id: string }) => b._id).map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
      comments: facets[0].comments.filter((b: { _id: string }) => b._id).map((b: { _id: string; count: number }) => ({ key: b._id, doc_count: b.count })),
      publishers: facets[0].publishers.map((b: { _id: string; count: number }) => ({
        key: b._id,
        label: publishers.find((p) => p.id === b._id)?.name,
        doc_count: b.count,
      })),
      organizations: facets[0].organization.map((b: { _id: string; count: number }) => ({
        key: b._id,
        label: b._id,
        doc_count: b.count,
      })),
      departments: facets[0].departments.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      cities: facets[0].cities.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      domains: facets[0].domains.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
      activities: facets[0].activities.map((b: { _id: string; count: number }) => ({
        key: b._id,
        doc_count: b.count,
      })),
    };

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/search-history", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        moderatorId: zod.string(),
        associationId: zod.string().optional(),
        organizationName: zod.string().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const where = {
      deleted: false,
      statusCode: "ACCEPTED",
      [`moderation_${body.data.moderatorId}_status`]: { $exists: true },
    };

    if (body.data.associationId) {
      where.associationId = body.data.associationId;
    }
    if (body.data.organizationName) {
      where.organizationName = body.data.organizationName;
    }

    const response = await MissionModel.aggregate([
      {
        $match: where,
      },
      {
        $facet: {
          association: [
            {
              $group: {
                _id: "$associationId",
                count: { $sum: 1 },
                acceptedCount: {
                  $sum: {
                    $cond: [{ $eq: [`$moderation_${body.data.moderatorId}_status`, "ACCEPTED"] }, 1, 0],
                  },
                },
                refusedCount: {
                  $sum: {
                    $cond: [{ $eq: [`$moderation_${body.data.moderatorId}_status`, "REFUSED"] }, 1, 0],
                  },
                },
              },
            },
          ],
          organization: [
            {
              $group: {
                _id: "$organizationName",
                count: { $sum: 1 },
                acceptedCount: {
                  $sum: {
                    $cond: [{ $eq: [`$moderation_${body.data.moderatorId}_status`, "ACCEPTED"] }, 1, 0],
                  },
                },
                refusedCount: {
                  $sum: {
                    $cond: [{ $eq: [`$moderation_${body.data.moderatorId}_status`, "REFUSED"] }, 1, 0],
                  },
                },
              },
            },
          ],
        },
      },
    ]);
    const data = {
      association: {} as { [key: string]: { [key: string]: number } },
      organization: {} as { [key: string]: { [key: string]: number } },
    };
    response[0].association.forEach((b: { _id: string; count: number; acceptedCount: number; refusedCount: number }) => {
      if (!data.association[b._id]) {
        data.association[b._id] = {};
      }
      data.association[b._id].total = b.count;
      data.association[b._id]["ACCEPTED"] = b.acceptedCount;
      data.association[b._id]["REFUSED"] = b.refusedCount;
    });

    response[0].organization.forEach((b: { _id: string; count: number; acceptedCount: number; refusedCount: number }) => {
      if (!data.organization[b._id]) {
        data.organization[b._id] = {};
      }
      data.organization[b._id].total = b.count;
      data.organization[b._id]["ACCEPTED"] = b.acceptedCount;
      data.organization[b._id]["REFUSED"] = b.refusedCount;
    });

    return res.status(200).send({ ok: true, data, response, total: Object.keys(data).length });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        moderatorId: zod.string(),
      })
      .safeParse(req.query);

    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const mission = await MissionModel.findById(params.data.id).lean();
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const moderator = await publisherService.getPublisherById(query.data.moderatorId);
    if (!moderator) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Moderator not found" });
    }
    if (!moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Moderator not found" });
    }

    const userPublisherIds = req.user.publishers.map((publisherId: string) => publisherId.toString());
    if (req.user.role !== "admin" && !userPublisherIds.includes(moderator.id)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Moderator not found" });
    }

    const data = {
      ...mission,
      newTitle: mission[`moderation_${query.data.moderatorId}_title`],
      status: mission[`moderation_${query.data.moderatorId}_status`],
      comment: mission[`moderation_${query.data.moderatorId}_comment`],
      note: mission[`moderation_${query.data.moderatorId}_note`],
    } as Mission;

    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    next(error);
  }
});

router.put("/many", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        moderatorId: zod.string(),
        where: zod.object({
          status: zod.enum(["ACCEPTED", "REFUSED", "PENDING", "ONGOING"]).optional(),
          organizationClientId: zod.string().optional(),
          organizationRNAVerified: zod.union([zod.string(), zod.object({ $ne: zod.string() })]).optional(),
          organizationSirenVerified: zod.union([zod.string(), zod.object({ $ne: zod.string() })]).optional(),
        }),
        update: zod.object({
          status: zod.enum(["ACCEPTED", "REFUSED", "PENDING", "ONGOING"]).optional(),
          comment: zod.string().optional(),
          organizationId: zod.string().nullable().optional(),
          organizationRNAVerified: zod.string().nullable().optional(),
          organizationSirenVerified: zod.string().nullable().optional(),
        }),
      })
      .required()
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const moderator = await publisherService.getPublisherById(body.data.moderatorId);
    if (!moderator || !moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }
    if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.moderatorId)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const where = {
      deletedAt: null,
      publisherId: { $in: moderator.publishers.map((p) => p.diffuseurPublisherId) },
    } as any;
    if (body.data.where.status) {
      where[`moderation_${body.data.moderatorId}_status`] = body.data.where.status;
    }
    if (body.data.where.organizationClientId) {
      where.organizationClientId = body.data.where.organizationClientId;
    }
    if (body.data.where.organizationRNAVerified && body.data.where.organizationSirenVerified) {
      where.$or = [{ organizationRNAVerified: body.data.where.organizationRNAVerified }, { organizationSirenVerified: body.data.where.organizationSirenVerified }];
    } else if (body.data.where.organizationRNAVerified) {
      where.organizationRNAVerified = body.data.where.organizationRNAVerified;
    } else if (body.data.where.organizationSirenVerified) {
      where.organizationSirenVerified = body.data.where.organizationSirenVerified;
    }

    const missions = await MissionModel.find(where);

    const update = {} as Mission;

    if (body.data.update.status) {
      update[`moderation_${body.data.moderatorId}_status`] = body.data.update.status;
    }
    if (body.data.update.comment) {
      update[`moderation_${body.data.moderatorId}_comment`] = body.data.update.comment;
    }
    if (body.data.update.organizationId !== undefined) {
      update.organizationId = body.data.update.organizationId;
    }

    if (body.data.update.organizationRNAVerified !== undefined) {
      update.organizationRNAVerified = body.data.update.organizationRNAVerified;
    }
    if (body.data.update.organizationSirenVerified !== undefined) {
      update.organizationSirenVerified = body.data.update.organizationSirenVerified;
    }
    for (const mission of missions) {
      const previous = { ...mission.toObject() };
      mission.set(update);
      await mission.save();
      await logModeration(previous, mission, req.user, body.data.moderatorId);
    }

    const data = missions.map((mission) => buildData(mission, body.data.moderatorId));
    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    next(error);
  }
});

router.put("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    const body = zod
      .object({
        status: zod.enum(["ACCEPTED", "REFUSED", "PENDING", "ONGOING"]).optional(),
        moderatorId: zod.string(),
        comment: zod.string().nullable().optional(),
        note: zod.string().nullable().optional(),
        newTitle: zod.string().nullable().optional(),
        organizationId: zod.string().nullable().optional(),
        organizationRNAVerified: zod.string().nullable().optional(),
        organizationSirenVerified: zod.string().nullable().optional(),
      })
      .safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    if (body.data.status === "REFUSED" && !body.data.comment) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: "COMMENT_REQUIRED" });
    }

    const moderator = await publisherService.getPublisherById(body.data.moderatorId);
    if (!moderator || !moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }
    const userPublisherIds = req.user.publishers.map((publisherId: string) => publisherId.toString());
    if (req.user.role !== "admin" && !userPublisherIds.includes(body.data.moderatorId)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const mission = await MissionModel.findById(params.data.id);
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    const previous = { ...mission.toObject() };

    if (body.data.status) {
      mission[`moderation_${body.data.moderatorId}_status`] = body.data.status;
    }
    if (body.data.status === "REFUSED") {
      mission[`moderation_${body.data.moderatorId}_comment`] = body.data.comment || "";
    } else {
      mission[`moderation_${body.data.moderatorId}_comment`] = "";
    }

    if (body.data.note) {
      mission[`moderation_${body.data.moderatorId}_note`] = body.data.note;
    }
    if (body.data.newTitle) {
      mission[`moderation_${body.data.moderatorId}_title`] = body.data.newTitle;
    }

    if (body.data.organizationId !== undefined) {
      mission.organizationId = body.data.organizationId || null;
    }

    if (body.data.organizationRNAVerified !== undefined) {
      mission.organizationRNAVerified = body.data.organizationRNAVerified || null;
      mission.organizationVerificationStatus = "DATA_MANUALLY_ADDED";
    }
    if (body.data.organizationSirenVerified !== undefined) {
      mission.organizationSirenVerified = body.data.organizationSirenVerified || null;
      mission.organizationVerificationStatus = "DATA_MANUALLY_ADDED";
    }

    mission[`moderation_${body.data.moderatorId}_date`] = new Date();

    await mission.save();
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    await logModeration(previous, mission, req.user, body.data.moderatorId);

    const data = buildData(mission, body.data.moderatorId);
    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    next(error);
  }
});

const buildData = (source: Mission, moderatorId: string) => ({
  _id: source._id,
  applicationUrl: source.applicationUrl,
  title: source.title,
  description: source.description,
  address: source.address,
  city: source.city,
  departmentCode: source.departmentCode,
  domain: source.domain,
  activity: source.activity,
  postedAt: source.postedAt,
  startAt: source.startAt,
  endAt: source.endAt,
  publisherId: source.publisherId,
  publisherName: source.publisherName,
  associationSources: source.associationSources,
  organizationName: source.organizationName,
  organizationFullAddress: source.organizationFullAddress,
  organizationUrl: source.organizationUrl,
  organizationId: source.organizationId,
  organizationSiren: source.organizationSiren,
  organizationRNA: source.organizationRNA,
  organizationRNAVerified: source.organizationRNAVerified,
  organizationSirenVerified: source.organizationSirenVerified,

  newTitle: source[`moderation_${moderatorId}_title`],
  status: source[`moderation_${moderatorId}_status`],
  comment: source[`moderation_${moderatorId}_comment`],
  note: source[`moderation_${moderatorId}_note`],
});

export default router;
