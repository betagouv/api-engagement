import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import { missionService } from "../services/mission";
import { missionModerationStatusService, MissionModerationStatusUpdatePatch } from "../services/mission-moderation-status";
import { moderationEventService } from "../services/moderation-event";
import { publisherService } from "../services/publisher";
import type { MissionRecord, MissionUpdatePatch } from "../types/mission";
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
  organizationName: zod.string().nullable().optional(),
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

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = searchSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: body.error });
    }
    const moderator = await publisherService.findOnePublisherById(body.data.moderatorId);
    if (!moderator) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const filters: any = {
      moderatorId: moderator.id,
      limit: body.data.size,
      skip: body.data.from,
      sort: body.data.sort,
      publisherId: body.data.publisherId || undefined,
      status: body.data.status || undefined,
      comment: body.data.comment || undefined,
      domain: body.data.domain || undefined,
      department: body.data.department || undefined,
      organizationName: body.data.organizationName || undefined,
      organizationClientId: body.data.organizationClientId || undefined,
      city: body.data.city || undefined,
      search: body.data.search || undefined,
      activity: body.data.activity || undefined,
    };

    const { data, total } = await missionModerationStatusService.findModerationStatuses(filters);

    return res.status(200).send({
      ok: true,
      data,
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

    const moderator = await publisherService.findOnePublisherById(body.data.moderatorId);
    if (!moderator) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const filters = {
      moderatorId: moderator.id,
      publisherId: body.data.publisherId || undefined,
      status: body.data.status || undefined,
      comment: body.data.comment || undefined,
      domain: body.data.domain || undefined,
      department: body.data.department || undefined,
      organizationName: body.data.organizationName || undefined,
      city: body.data.city || undefined,
      activity: body.data.activity || undefined,
      search: body.data.search || undefined,
    };

    const dataAggs = await missionModerationStatusService.aggregateModerationStatuses(filters);

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

    const moderation = await missionModerationStatusService.findOneMissionModerationStatus(params.data.id);
    if (!moderation) {
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

    return res.status(200).send({ ok: true, data: moderation });
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
      publisherId: body.data.moderatorId,
      status: body.data.status,
      comment: body.data.comment ?? null,
      note: body.data.note ?? null,
      title: body.data.title ?? null,
    }));

    await missionModerationStatusService.upsertStatuses(updates);

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
        comment: zod.string().nullable().optional(),
        title: zod.string().nullable().optional(),
        note: zod.string().nullable().optional(),
        missionOrganizationRNAVerified: zod.string().nullable().optional(),
        missionOrganizationSirenVerified: zod.string().nullable().optional(),
        missionOrganizationName: zod.string().nullable().optional(),
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

    const moderator = await publisherService.findOnePublisherById(body.data.moderatorId);
    if (!moderator || !moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const userPublisherIds = req.user.publishers.map((publisherId: string) => publisherId.toString());
    if (req.user.role !== "admin" && !userPublisherIds.includes(moderator.id)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const previous = await missionModerationStatusService.findOneMissionModerationStatus(params.data.id);
    if (!previous) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const moderatorId = body.data.moderatorId;

    // Update moderation status in dedicated table
    let updated = { ...previous };
    const update: MissionModerationStatusUpdatePatch = {};
    if (body.data.status) {
      update.status = body.data.status;
    }
    if (body.data.comment) {
      update.comment = body.data.comment;
    }
    if (body.data.note) {
      update.note = body.data.note;
    }
    if (body.data.title) {
      update.title = body.data.title;
    }
    if (Object.keys(update).length) {
      updated = await missionModerationStatusService.update(previous.id, update);
    }

    // Update mission fields (organization verification)
    const missionUpdate: MissionUpdatePatch = {};
    if (body.data.missionOrganizationRNAVerified !== undefined && body.data.missionOrganizationRNAVerified !== previous.missionOrganizationRNAVerified) {
      missionUpdate.organizationRNAVerified = body.data.missionOrganizationRNAVerified;
    }
    if (body.data.missionOrganizationSirenVerified !== undefined && body.data.missionOrganizationSirenVerified !== previous.missionOrganizationSirenVerified) {
      missionUpdate.organizationSirenVerified = body.data.missionOrganizationSirenVerified;
    }
    if (body.data.missionOrganizationName !== undefined && body.data.missionOrganizationName !== previous.missionOrganizationName) {
      missionUpdate.organizationName = body.data.missionOrganizationName;
    }
    let missionUpdated: MissionRecord | null = null;
    if (Object.keys(missionUpdate).length) {
      missionUpdated = await missionService.update(previous.missionId, missionUpdate);
    }

    // Create moderation events for audit
    const moderationEvents: ModerationEventCreateInput[] = [];

    if (previous.status !== updated.status) {
      moderationEvents.push({
        missionId: previous.missionId,
        moderatorId,
        initialStatus: previous.status ?? null,
        newStatus: updated.status,
      });
    }

    if (previous.comment !== updated.comment) {
      moderationEvents.push({
        missionId: previous.missionId,
        moderatorId,
        initialComment: previous.comment ?? null,
        newComment: updated.comment,
      });
    }

    if (previous.title !== updated.title) {
      moderationEvents.push({
        missionId: previous.missionId,
        moderatorId,
        initialTitle: previous.title ?? null,
        newTitle: updated.title,
      });
    }

    if (previous.note !== updated.note) {
      moderationEvents.push({
        missionId: previous.missionId,
        moderatorId,
        initialNote: previous.note ?? null,
        newNote: updated.note,
      });
    }

    if (missionUpdated && previous.missionOrganizationSirenVerified !== missionUpdated.organizationSirenVerified) {
      moderationEvents.push({
        missionId: missionUpdated.id,
        moderatorId,
        initialSiren: previous.missionOrganizationSirenVerified ?? null,
        newSiren: missionUpdated.organizationSirenVerified ?? null,
      });
    }
    if (missionUpdated && previous.missionOrganizationRNAVerified !== missionUpdated.organizationRNAVerified) {
      moderationEvents.push({
        missionId: missionUpdated.id,
        moderatorId,
        initialRNA: previous.missionOrganizationRNAVerified ?? null,
        newRNA: missionUpdated.organizationRNAVerified ?? null,
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
          initialSiren: event.initialSiren ?? null,
          newSiren: event.newSiren ?? null,
          initialRNA: event.initialRNA ?? null,
          newRNA: event.newRNA ?? null,
        }))
      );
    }

    return res.status(200).send({ ok: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
