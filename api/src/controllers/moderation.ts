import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import publisherOrganizationRepository from "../repositories/publisher-organization";
import { missionModerationStatusService } from "../services/mission-moderation-status";
import { moderationEventService } from "../services/moderation-event";
import { publisherService } from "../services/publisher";
import { UserRecord } from "../types";
import { MissionModerationRecord, ModerationFilters } from "../types/mission-moderation-status";
import type { UserRequest } from "../types/passport";
import { PublisherOrganizationWithRelations } from "../types/publisher-organization";
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
    const user = req.user as UserRecord;

    const body = zod
      .object({
        where: zod.object({
          moderatorId: zod.string(),
          ids: zod.array(zod.string()).optional(),
          organizationName: zod.string().optional(),
          status: zod.enum(["PENDING"]).optional(),
        }),
        update: zod.object({
          status: zod.enum(["ACCEPTED", "REFUSED", "PENDING", "ONGOING"]).optional(),
          comment: zod.string().nullable().optional(),
          note: zod.string().nullable().optional(),
          title: zod.string().nullable().optional(),
        }),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const moderator = await publisherService.findOnePublisherById(body.data.where.moderatorId);
    if (!moderator || !moderator.moderator) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    const userPublisherIds = user.publishers.map((publisherId: string) => publisherId.toString());
    if (user.role !== "admin" && !userPublisherIds.includes(moderator.id)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN });
    }

    // Fetch all previous states at once (either by IDs or by where filter)
    const { data: previousStatuses, total } = await missionModerationStatusService.findModerationStatuses(body.data.where);

    if (total === 0) {
      return res.status(200).send({ ok: true, data: { updated: 0, events: 0 } });
    }

    const previousMap = new Map(previousStatuses.map((s) => [s.id, s]));
    const validIds = previousStatuses.map((s) => s.id);

    // Update all moderation statuses at once
    const moderationUpdates = getModerationUpdates(body.data.update);
    if (!moderationUpdates) {
      return res.status(200).send({ ok: true, data: { updatedIds: [] } });
    }
    const updatedStatuses = await missionModerationStatusService.updateMany(validIds, moderationUpdates);

    // Collect all moderation events
    const allModerationEvents: ReturnType<typeof getModerationEvents> = [];
    for (const updated of updatedStatuses) {
      const previous = previousMap.get(updated.id);
      if (!previous) {
        continue;
      }
      const obj = {
        id: updated.id,
        status: updated.status ?? null,
        comment: updated.comment ?? null,
        missionId: updated.missionId,
        note: null,
        title: null,
      } as MissionModerationRecord;
      const events = getModerationEvents(previous, obj);
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

    return res.status(200).send({ ok: true, data: { updatedIds: updatedStatuses.map((s) => s.id) } });
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
        rna: zod.string().nullable().optional(),
        siren: zod.string().nullable().optional(),
        organizationVerifiedId: zod.string().nullable().optional(),
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
    let updated = { ...previous };

    // Update mission fields (organization verification)
    const organizationUpdates = getOrganizationUpdates(body.data, previous);
    if (organizationUpdates && previous.missionPublisherOrganizationId) {
      const organizationUpdated = (await publisherOrganizationRepository.update(previous.missionPublisherOrganizationId, organizationUpdates, {
        include: { organizationVerified: true },
      })) as PublisherOrganizationWithRelations;
      updated.missionOrganizationRNA = organizationUpdated.rna ?? null;
      updated.missionOrganizationSiren = organizationUpdated.siren ?? null;
      updated.missionOrganizationRNAVerified = organizationUpdated.organizationVerified?.rna ?? null;
      updated.missionOrganizationSirenVerified = organizationUpdated.organizationVerified?.siren ?? null;
      updated.missionOrganizationVerifiedId = organizationUpdated.organizationIdVerified ?? null;
    }

    // Update moderation status in dedicated table
    const updates = getModerationUpdates(body.data);
    if (updates) {
      updated = await missionModerationStatusService.update(previous.id, updates);
    }

    // Create moderation events for audit
    const moderationEvents = getModerationEvents(previous, updated);
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
