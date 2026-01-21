import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { PublisherOrganization } from "../db/core";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import publisherOrganizationRepository from "../repositories/publisher-organization";
import { missionModerationStatusService } from "../services/mission-moderation-status";
import { moderationEventService } from "../services/moderation-event";
import { publisherService } from "../services/publisher";
import { ModerationFilters } from "../types/mission-moderation-status";
import type { UserRequest } from "../types/passport";
import { getModerationEvents, getModerationUpdates, getOrganizationUpdates } from "../utils/mission-moderation-status";

const router = Router();

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

    const filters: ModerationFilters = {
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

    const moderator = await publisherService.findOnePublisherById(body.data.moderatorId);
    if (!moderator) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const result = await missionModerationStatusService.aggregateByOrganization({
      moderatorId: moderator.id,
      organizationName: body.data.organizationName,
    });

    return res.status(200).send({ ok: true, data: { organization: result.organization }, total: result.total });
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
        ids: zod.array(zod.string()),
        status: zod.enum(["ACCEPTED", "REFUSED", "PENDING", "ONGOING"]).optional(),
        comment: zod.string().nullable().optional(),
        note: zod.string().nullable().optional(),
        title: zod.string().nullable().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const moderator = await publisherService.findOnePublisherById(body.data.moderatorId);
    if (!moderator || !moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const userPublisherIds = req.user.publishers.map((publisherId: string) => publisherId.toString());
    if (req.user.role !== "admin" && !userPublisherIds.includes(moderator.id)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    // Fetch all previous states at once
    const previousStatuses = await missionModerationStatusService.findManyModerationStatusesByIds(body.data.ids);
    if (!previousStatuses.length) {
      return res.status(200).send({ ok: true, data: { updated: 0, events: 0 } });
    }

    const previousMap = new Map(previousStatuses.map((s) => [s.id, s]));
    const validIds = previousStatuses.map((s) => s.id);

    // Update all moderation statuses at once
    const moderationUpdates = getModerationUpdates(body.data);
    let updatedStatuses = previousStatuses;
    if (moderationUpdates) {
      updatedStatuses = await missionModerationStatusService.updateMany(validIds, moderationUpdates);
    }

    // Collect all moderation events
    const allModerationEvents: ReturnType<typeof getModerationEvents> = [];
    for (const updated of updatedStatuses) {
      const previous = previousMap.get(updated.id);
      if (!previous) {
        continue;
      }
      const events = getModerationEvents(previous, updated, null);
      allModerationEvents.push(...events);
    }

    // Create all events at once
    if (allModerationEvents.length) {
      await moderationEventService.createModerationEvents(
        allModerationEvents.map((event) => ({
          ...event,
          moderatorId: moderator.id,
          userId: req.user.id,
          userName: `${req.user.firstname} ${req.user.lastname}`,
        }))
      );
    }

    return res.status(200).send({ ok: true, data: { updated: updatedStatuses.length, events: allModerationEvents.length } });
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

    let previous = await missionModerationStatusService.findOneMissionModerationStatus(params.data.id);
    if (!previous) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    // Update mission fields (organization verification)
    const organizationUpdates = getOrganizationUpdates(body.data, previous);
    let organizationUpdated: PublisherOrganization | null = null;
    if (organizationUpdates && previous.missionOrganizationClientId) {
      organizationUpdated = await publisherOrganizationRepository.updateByPublisherAndClientId({
        publisherId: previous.missionPublisherId,
        organizationClientId: previous.missionOrganizationClientId,
        update: organizationUpdates,
      });
      previous.missionOrganizationRNAVerified = organizationUpdated.organizationRNAVerified;
      previous.missionOrganizationSirenVerified = organizationUpdated.organizationSirenVerified;
    }

    // Update moderation status in dedicated table
    const updates = getModerationUpdates(body.data);
    let updated = { ...previous };
    if (updates) {
      updated = await missionModerationStatusService.update(previous.id, updates);
    }

    // Create moderation events for audit
    const moderationEvents = getModerationEvents(previous, updated, organizationUpdated);
    if (moderationEvents.length) {
      await moderationEventService.createModerationEvents(
        moderationEvents.map((event) => ({
          ...event,
          moderatorId: moderator.id,
          userId: req.user.id,
          userName: `${req.user.firstname} ${req.user.lastname}`,
        }))
      );
    }

    return res.status(200).send({ ok: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
