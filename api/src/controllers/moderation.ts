import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import { missionService } from "../services/mission";
import { moderationEventService } from "../services/moderation-event";
import { publisherService } from "../services/publisher";
import type { MissionRecord } from "../types/mission";
import type { ModerationEventCreateInput } from "../types/moderation-event";
import type { UserRequest } from "../types/passport";

const router = Router();
type ModeratorStatusKey = `moderation_${string}_status`;
type ModeratorCommentKey = `moderation_${string}_comment`;

const searchSchema = zod.object({
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
});

const aggsSchema = zod.object({
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
});

const searchHistorySchema = zod.object({
  moderatorId: zod.string(),
  organizationName: zod.string().optional(),
});

const missionParamsSchema = zod.object({
  id: zod.string(),
});

const moderatorIdQuerySchema = zod.object({
  moderatorId: zod.string(),
});

const findFilters = async (user: UserRequest["user"], body: zod.infer<typeof searchSchema>) => {
  if (user.role !== "admin" && !user.publishers.includes(body.publisherId) && !user.publishers.includes(body.moderatorId)) {
    throw new Error("FORBIDDEN");
  }

  const moderator = await publisherService.findOnePublisherById(body.moderatorId);
  if (!moderator || !moderator.moderator) {
    throw new Error("FORBIDDEN");
  }

  const publisherIds = body.publisherId ? [body.publisherId] : moderator.publishers.map((p) => p.diffuseurPublisherId);
  const filters: any = {
    statusCode: "ACCEPTED",
    deletedAt: null,
    publisherIds,
    moderationAcceptedFor: body.moderatorId,
    limit: body.size,
    skip: body.from,
  };

  const asArray = (value: string | null | undefined) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    return [value];
  };

  if (body.status) {
    filters.moderationStatus = body.status;
  }
  if (body.comment) {
    filters.moderationComment = body.comment;
  }
  if (body.organizationName === "none") {
    filters.organizationName = [""];
  } else if (body.organizationName) {
    filters.organizationName = asArray(body.organizationName);
  }
  if (body.organizationClientId) {
    filters.organizationClientId = asArray(body.organizationClientId);
  }
  if (body.domain === "none") {
    filters.domain = [""];
  } else if (body.domain) {
    filters.domain = asArray(body.domain);
  }
  if (body.department === "none") {
    filters.departmentName = [""];
  } else if (body.department) {
    filters.departmentName = asArray(body.department);
  }
  if (body.city === "none") {
    filters.city = [""];
  } else if (body.city) {
    filters.city = asArray(body.city);
  }
  if (body.activity === "none") {
    filters.activity = [""];
  } else if (body.activity) {
    filters.activity = asArray(body.activity);
  }
  if (body.search) {
    const keywords = body.search.trim();
    if (keywords) {
      filters.keywords = keywords;
    }
  }
  if (body.organizationRNAVerified) {
    filters.organizationRNAVerified = body.organizationRNAVerified as any;
  }
  if (body.organizationSirenVerified) {
    filters.organizationSirenVerified = body.organizationSirenVerified as any;
  }

  return { filters, moderatorId: body.moderatorId };
};

const buildModerationProjection = (mission: MissionRecord, moderatorId: string) => {
  const statusKey: ModeratorStatusKey = `moderation_${moderatorId}_status`;
  const commentKey: ModeratorCommentKey = `moderation_${moderatorId}_comment`;
  return {
    ...mission,
    newTitle: (mission as any)[`moderation_${moderatorId}_title`],
    status: (mission as any)[statusKey],
    comment: (mission as any)[commentKey],
    note: (mission as any)[`moderation_${moderatorId}_note`],
  };
};

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = searchSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: body.error });
    }

    let parsed;
    try {
      parsed = await findFilters(req.user, body.data);
    } catch (error: any) {
      if (error.message === "FORBIDDEN") {
        return res.status(403).send({ ok: false, code: FORBIDDEN });
      }
      throw error;
    }

    const { data, total } = await missionService.findMissions(parsed.filters);
    const mapped = data.map((mission) => buildModerationProjection(mission, parsed.moderatorId));

    return res.status(200).send({
      ok: true,
      data: mapped,
      total,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/aggs", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = aggsSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: body.error });
    }

    let parsed;
    try {
      parsed = await findFilters(req.user, { ...body.data, size: 0, from: 0 } as any);
    } catch (error: any) {
      if (error.message === "FORBIDDEN") {
        return res.status(403).send({ ok: false, code: FORBIDDEN });
      }
      throw error;
    }

    const { data } = await missionService.findMissions(parsed.filters);
    const statusKey: ModeratorStatusKey = `moderation_${parsed.moderatorId}_status`;
    const commentKey: ModeratorCommentKey = `moderation_${parsed.moderatorId}_comment`;

    const countFacet = (getter: (mission: MissionRecord) => string | null | undefined) => {
      const map = new Map<string, number>();
      data.forEach((mission) => {
        const key = getter(mission);
        if (key) {
          map.set(key, (map.get(key) ?? 0) + 1);
        }
      });
      return Array.from(map.entries()).map(([key, count]) => ({ key, doc_count: count }));
    };

    const publishers = await publisherService.findPublishers();

    const mappedPublishers = countFacet((m) => m.publisherId).map((p) => ({
      key: p.key,
      label: publishers.find((pub) => pub.id === p.key)?.name,
      doc_count: p.doc_count,
    }));

    const dataAggs = {
      status: countFacet((m) => (m as any)[statusKey]),
      comments: countFacet((m) => (m as any)[commentKey]),
      publishers: mappedPublishers,
      organizations: countFacet((m) => m.organizationName),
      departments: countFacet((m) => m.departmentCode),
      cities: countFacet((m) => m.city),
      domains: countFacet((m) => m.domain),
      activities: countFacet((m) => m.activity),
    };

    return res.status(200).send({ ok: true, data: dataAggs });
  } catch (error) {
    next(error);
  }
});

router.post("/search-history", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = searchHistorySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const filters: any = {
      publisherIds: [],
      moderationAcceptedFor: body.data.moderatorId,
      statusCode: "ACCEPTED",
      deletedAt: null,
      limit: 1000,
      skip: 0,
    };

    if (body.data.organizationName) {
      filters.organizationName = body.data.organizationName;
    }

    const { data } = await missionService.findMissions(filters);
    const statusKey: ModeratorStatusKey = `moderation_${body.data.moderatorId}_status`;

    const aggregation = { organization: {} as Record<string, any> };
    data.forEach((mission) => {
      const status = (mission as any)[statusKey];

      if (body.data.organizationName && mission.organizationName) {
        aggregation.organization[mission.organizationName] = aggregation.organization[mission.organizationName] || { total: 0, ACCEPTED: 0, REFUSED: 0 };
        aggregation.organization[mission.organizationName].total += 1;
        if (status === "ACCEPTED") {
          aggregation.organization[mission.organizationName].ACCEPTED += 1;
        }
        if (status === "REFUSED") {
          aggregation.organization[mission.organizationName].REFUSED += 1;
        }
      }
    });

    return res.status(200).send({ ok: true, data: aggregation, total: data.length });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = moderatorIdQuerySchema.safeParse(req.query);
    const params = missionParamsSchema.safeParse(req.params);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const mission = await missionService.findOneMission(params.data.id);
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const moderator = await publisherService.findOnePublisherById(query.data.moderatorId);
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

    const data = buildModerationProjection(mission, query.data.moderatorId);
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
        missionIds: zod.array(zod.string()),
        status: zod.enum(["ACCEPTED", "REFUSED", "PENDING", "ONGOING"]),
        comment: zod.string().nullable().optional(),
        note: zod.string().nullable().optional(),
        title: zod.string().nullable().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const moderator = await publisherService.findOnePublisherById(body.data.moderatorId);
    if (!moderator) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    if (!moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const missions: MissionRecord[] = [];
    for (const missionId of body.data.missionIds) {
      const mission = await missionService.findOneMission(missionId);
      if (mission) {
        missions.push(mission);
      }
    }

    const updates = missions.map((mission) => ({
      missionId: mission.id,
      moderatorId: body.data.moderatorId,
      status: body.data.status,
      comment: body.data.comment ?? null,
      note: body.data.note ?? null,
      title: body.data.title ?? null,
    }));

    await Promise.all(
      updates.map(async (update) => {
        await missionService.update(update.missionId, {
          [`moderation_${update.moderatorId}_status`]: update.status as any,
          [`moderation_${update.moderatorId}_comment`]: update.comment as any,
          [`moderation_${update.moderatorId}_note`]: update.note as any,
          [`moderation_${update.moderatorId}_title`]: update.title as any,
        } as any);
      })
    );

    return res.status(200).send({ ok: true, data: missions.length });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        status: zod.enum(["ACCEPTED", "REFUSED", "PENDING", "ONGOING"]).optional(),
        comment: zod.string().optional(),
        title: zod.string().optional(),
        note: zod.string().optional(),
        organizationRNAVerified: zod.string().optional(),
        organizationSirenVerified: zod.string().optional(),
        newOrganizationName: zod.string().optional(),
        moderatorId: zod.string(),
      })
      .safeParse(req.body);

    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const mission = await missionService.findOneMission(params.data.id);
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const moderator = await publisherService.findOnePublisherById(body.data.moderatorId);
    if (!moderator || !moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const userPublisherIds = req.user.publishers.map((publisherId: string) => publisherId.toString());
    if (req.user.role !== "admin" && !userPublisherIds.includes(moderator.id)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const update: any = {};
    const previous = mission as any;

    if (body.data.status) {
      update[`moderation_${body.data.moderatorId}_status`] = body.data.status;
    }
    if (body.data.title) {
      update[`moderation_${body.data.moderatorId}_title`] = body.data.title;
    }
    if (body.data.comment) {
      update[`moderation_${body.data.moderatorId}_comment`] = body.data.comment;
    }
    if (body.data.note) {
      update[`moderation_${body.data.moderatorId}_note`] = body.data.note;
    }

    if (body.data.organizationRNAVerified) {
      update.organizationRNAVerified = body.data.organizationRNAVerified;
    }

    if (body.data.organizationSirenVerified) {
      update.organizationSirenVerified = body.data.organizationSirenVerified;
    }

    if (body.data.newOrganizationName) {
      update.organizationName = body.data.newOrganizationName;
    }

    if (Object.keys(update).length) {
      await missionService.update(params.data.id, update);
    }

    const moderationEvents: ModerationEventCreateInput[] = [];
    const newModerationFields = {
      status: body.data.status,
      comment: body.data.comment,
      note: body.data.note,
      title: body.data.title,
    };

    if (newModerationFields.status && previous[`moderation_${body.data.moderatorId}_status`] !== newModerationFields.status) {
      moderationEvents.push({
        missionId: params.data.id,
        moderatorId: body.data.moderatorId,
        initialStatus: previous[`moderation_${body.data.moderatorId}_status`] ?? null,
        newStatus: newModerationFields.status,
      });
    }

    if (newModerationFields.comment && previous[`moderation_${body.data.moderatorId}_comment`] !== newModerationFields.comment) {
      moderationEvents.push({
        missionId: params.data.id,
        moderatorId: body.data.moderatorId,
        initialComment: previous[`moderation_${body.data.moderatorId}_comment`] ?? null,
        newComment: newModerationFields.comment,
      });
    }

    if (newModerationFields.title && previous[`moderation_${body.data.moderatorId}_title`] !== newModerationFields.title) {
      moderationEvents.push({
        missionId: params.data.id,
        moderatorId: body.data.moderatorId,
        initialTitle: previous[`moderation_${body.data.moderatorId}_title`] ?? null,
        newTitle: newModerationFields.title,
      });
    }

    if (newModerationFields.note && previous[`moderation_${body.data.moderatorId}_note`] !== newModerationFields.note) {
      moderationEvents.push({
        missionId: params.data.id,
        moderatorId: body.data.moderatorId,
        initialNote: previous[`moderation_${body.data.moderatorId}_note`] ?? null,
        newNote: newModerationFields.note,
      });
    }

    if (moderationEvents.length) {
      await moderationEventService.createModerationEvents(
        moderationEvents.map((event) => ({
          missionId: event.missionId,
          moderatorId: event.moderatorId,
          userId: req.user.id,
          userName: `${req.user.firstname} ${req.user.lastname}`,
          initialStatus: event.initialStatus ?? null,
          newStatus: event.newStatus ?? null,
          initialComment: event.initialComment ?? null,
          newComment: event.newComment ?? null,
          initialNote: event.initialNote ?? null,
          newNote: event.newNote ?? null,
          initialTitle: event.initialTitle ?? null,
          newTitle: event.newTitle ?? null,
          initialSiren: mission.organizationSirenVerified,
          newSiren: mission.organizationSirenVerified,
          initialRNA: mission.organizationRNAVerified,
          newRNA: mission.organizationRNAVerified,
        }))
      );
    }

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
