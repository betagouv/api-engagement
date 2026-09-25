import { NextFunction, Response, Router } from "express";
import { convert } from "html-to-text";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "@/error";
import { missionService } from "@/services/mission";
import { MissionCreateInput, MissionRemote, MissionSearchFilters, MissionUpdatePatch } from "@/types/mission";
import { PublisherRequest } from "@/types/passport";
import { PublisherRecord, PublisherRecordWithRelations } from "@/types/publisher";
import { getDistanceKm } from "@/utils";
import { getModeration } from "@/utils/mission-moderation";
import { missionQuerySchema } from "@/v0/mission/query";
import { normalizeQueryArray, parseDateFilter } from "@/v0/mission/utils";

import { publisherRateLimiter } from "@/middlewares/rate-limit";
import { buildAddresses, buildData, hasOrgFields, upsertPublisherOrganization } from "./helpers";

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────────────────────────────────────

const addressSchema = zod.object({
  street: zod.string().optional(),
  postalCode: zod.string().optional(),
  city: zod.string().optional(),
  departmentCode: zod.string().optional(),
  departmentName: zod.string().optional(),
  region: zod.string().optional(),
  country: zod.string().optional(),
});

const orgFields = {
  organizationClientId: zod.string().optional(),
  organizationName: zod.string().optional(),
  organizationDescription: zod.string().optional(),
  organizationUrl: zod.string().optional(),
  organizationType: zod.string().optional(),
  organizationLogo: zod.string().optional(),
  organizationRNA: zod.string().optional(),
  organizationSiren: zod.string().optional(),
  organizationSiret: zod.string().optional(),
  organizationFullAddress: zod.string().optional(),
  organizationPostCode: zod.string().optional(),
  organizationCity: zod.string().optional(),
  organizationDepartment: zod.string().optional(),
  organizationDepartmentCode: zod.string().optional(),
  organizationDepartmentName: zod.string().optional(),
  organizationStatusJuridique: zod.string().optional(),
  organizationBeneficiaries: zod.array(zod.string()).optional(),
  organizationActions: zod.array(zod.string()).optional(),
  organizationReseaux: zod.array(zod.string()).optional(),
};

const missionBaseFields = {
  title: zod.string().optional(),
  description: zod.string().optional(),
  applicationUrl: zod.string().optional(),
  image: zod.string().optional(),
  metadata: zod.string().optional(),
  postedAt: zod.coerce.date().optional(),
  domain: zod.string().optional(),
  activities: zod.array(zod.string()).optional(),
  tags: zod.array(zod.string()).optional(),
  tasks: zod.array(zod.string()).optional(),
  audience: zod.array(zod.string()).optional(),
  requirements: zod.array(zod.string()).optional(),
  softSkills: zod.array(zod.string()).optional(),
  romeSkills: zod.array(zod.string()).optional(),
  remote: zod.enum(["no", "possible", "full", "local"]).optional(),
  schedule: zod.string().optional(),
  startAt: zod.coerce.date().optional(),
  endAt: zod.coerce.date().optional(),
  priority: zod.string().optional(),
  places: zod.number().int().positive().optional(),
  compensationAmount: zod.number().optional(),
  compensationAmountMax: zod.number().min(0).optional(),
  compensationUnit: zod.enum(["hour", "day", "month", "year"]).optional(),
  compensationType: zod.enum(["gross", "net"]).optional(),
  openToMinors: zod.boolean().optional(),
  reducedMobilityAccessible: zod.boolean().optional(),
  closeToTransport: zod.boolean().optional(),
  addresses: zod.array(addressSchema).optional(),
  type: zod.enum(["benevolat", "volontariat_service_civique", "volontariat_sapeurs_pompiers", "volontariat_reserve_operationnelle"]).optional(),
  ...orgFields,
};

const orgNameRequiredRefinement = <T extends Record<string, unknown>>(data: T, ctx: zod.RefinementCtx) => {
  const orgFieldKeys = Object.keys(orgFields) as Array<keyof typeof orgFields>;
  const hasOrgField = orgFieldKeys.some((key) => key !== "organizationName" && data[key] !== undefined);
  if (hasOrgField && !data.organizationName) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: "organizationName is required when any organization field is provided",
      path: ["organizationName"],
    });
  }
};

const missionCreateSchema = zod
  .object({
    clientId: zod.string(),
    ...missionBaseFields,
    title: zod.string(),
  })
  .superRefine(orgNameRequiredRefinement);

const missionUpdateSchema = zod
  .object({
    ...missionBaseFields,
  })
  .superRefine(orgNameRequiredRefinement);

const missionClientIdParamSchema = zod.object({
  clientId: zod.string(),
});

const missionListQuerySchema = missionQuerySchema
  .omit({ limit: true, skip: true })
  .extend({
    limit: zod.coerce.number().int().min(1).max(100).default(25),
    cursor: zod.string().min(1).max(256).optional(),
  })
  .strict();

const parseBooleanQuery = (value?: string): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (["true", "yes", "1"].includes(value.toLowerCase())) {
    return true;
  }
  if (["false", "no", "0"].includes(value.toLowerCase())) {
    return false;
  }
  return undefined;
};

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

const normalizeMissionDescriptionInput = (description?: string): Pick<MissionCreateInput, "description" | "descriptionHtml"> => {
  if (description === undefined) {
    return {};
  }

  if (!HTML_TAG_REGEX.test(description)) {
    return { description, descriptionHtml: description };
  }

  return {
    description: convert(description, {
      preserveNewlines: true,
      selectors: [{ selector: "ul", options: { itemPrefix: " • " } }],
    }),
    descriptionHtml: description,
  };
};

// GET /v2/mission — liste à pagination par curseur
router.get("/", passport.authenticate(["apikey", "api"], { session: false }), publisherRateLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const publisher = req.user as PublisherRecordWithRelations;
    const parsed = missionListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: parsed.error });
    }
    const query = parsed.data;
    const filters: MissionSearchFilters & { diffuseurPublisherId: string } = {
      diffuseurPublisherId: publisher.id,
      moderationAcceptedFor: publisher.moderator ? publisher.id : undefined,
      publisherIds: normalizeQueryArray(query.publisher),
      activity: normalizeQueryArray(query.activity),
      city: normalizeQueryArray(query.city),
      clientId: normalizeQueryArray(query.clientId),
      country: normalizeQueryArray(query.country),
      createdAt: parseDateFilter(query.createdAt),
      departmentName: normalizeQueryArray(query.departmentName),
      domain: normalizeQueryArray(query.domain),
      keywords: query.keywords,
      organizationRNA: normalizeQueryArray(query.organizationRNA),
      organizationStatusJuridique: normalizeQueryArray(query.organizationStatusJuridique),
      openToMinors: parseBooleanQuery(query.openToMinors),
      reducedMobilityAccessible: parseBooleanQuery(query.reducedMobilityAccessible),
      remote: normalizeQueryArray(query.remote) as MissionRemote[] | undefined,
      snu: query.snu,
      startAt: parseDateFilter(query.startAt),
      type: normalizeQueryArray(query.type),
      limit: query.limit,
      skip: 0,
    };
    if (query.lat !== undefined && query.lon !== undefined) {
      const rawDistance = query.distance === "0" || query.distance === "0km" ? "10km" : query.distance || "50km";
      filters.lat = query.lat;
      filters.lon = query.lon;
      filters.distanceKm = getDistanceKm(rawDistance);
    }

    const result = await missionService.findMissionsAfterId(filters, query.cursor);
    return res.status(200).send({
      ok: true,
      data: result.data.map(buildData),
      limit: query.limit,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /v2/mission — Create
// ──────────────────────────────────────────────────────────────────────────────

router.post("/", passport.authenticate(["apikey", "api"], { session: false }), publisherRateLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const publisher = req.user as PublisherRecord;

    const parsed = missionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: parsed.error });
    }
    const body = parsed.data;

    const existing = await missionService.findMissionByClientAndPublisher(body.clientId, publisher.id);
    if (existing) {
      return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, message: "A mission with this clientId already exists for this publisher" });
    }

    let publisherOrganizationId: string | null = null;
    if (hasOrgFields(body)) {
      publisherOrganizationId = await upsertPublisherOrganization(body, publisher.id);
    }

    const input: MissionCreateInput = {
      clientId: body.clientId,
      title: body.title,
      statusCode: "ACCEPTED",
      publisherId: publisher.id,
      publisherOrganizationId: publisherOrganizationId ?? undefined,
      lastSyncAt: new Date(),
      placesStatus: body.places ? "GIVEN_BY_PARTNER" : "ATTRIBUTED_BY_API",
      addresses: buildAddresses(body.addresses),
      ...normalizeMissionDescriptionInput(body.description),
      applicationUrl: body.applicationUrl,
      domainLogo: body.image,
      metadata: body.metadata,
      postedAt: body.postedAt,
      domain: body.domain,
      activities: body.activities,
      tags: body.tags,
      tasks: body.tasks,
      audience: body.audience,
      requirements: body.requirements,
      softSkills: body.softSkills,
      romeSkills: body.romeSkills,
      remote: body.remote,
      schedule: body.schedule,
      startAt: body.startAt,
      endAt: body.endAt,
      priority: body.priority,
      places: body.places || 1,
      compensationAmount: body.compensationAmount,
      compensationAmountMax: body.compensationAmountMax,
      compensationUnit: body.compensationUnit,
      compensationType: body.compensationType,
      openToMinors: body.openToMinors,
      reducedMobilityAccessible: body.reducedMobilityAccessible,
      closeToTransport: body.closeToTransport,
      type: body.type,
      organizationClientId: body.organizationClientId,
      organizationName: body.organizationName,
      organizationDescription: body.organizationDescription,
      organizationUrl: body.organizationUrl,
      organizationType: body.organizationType,
      organizationLogo: body.organizationLogo,
      organizationRNA: body.organizationRNA,
      organizationSiren: body.organizationSiren,
      organizationSiret: body.organizationSiret,
      organizationFullAddress: body.organizationFullAddress,
      organizationPostCode: body.organizationPostCode,
      organizationCity: body.organizationCity,
      organizationStatusJuridique: body.organizationStatusJuridique,
      organizationBeneficiaries: body.organizationBeneficiaries,
      organizationActions: body.organizationActions,
      organizationReseaux: body.organizationReseaux,
    };

    const moderation = getModeration(input);
    input.statusCode = moderation.statusCode;
    input.statusComment = moderation.statusComment;
    if (moderation.description !== undefined) {
      input.description = moderation.description;
    }

    const mission = await missionService.create(input);
    // Matérialise `mission_diffusion` pour cette mission sans attendre le rebuild 6h (chemin XML exclu :
    // l'import passe aussi par `missionService.create`, on ne l'enfile donc que depuis l'endpoint v2).
    await missionService.enqueueMissionDiffusion(mission.id);
    return res.status(201).send({ ok: true, data: buildData(mission) });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /v2/mission/:clientId — Update (PATCH semantics)
// ──────────────────────────────────────────────────────────────────────────────

router.put("/:clientId", passport.authenticate(["apikey", "api"], { session: false }), publisherRateLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const publisher = req.user as PublisherRecord;

    const params = missionClientIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const parsed = missionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: parsed.error });
    }
    const body = parsed.data;

    const existing = await missionService.findMissionByClientAndPublisher(params.data.clientId, publisher.id);
    if (!existing || existing.deletedAt) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    let publisherOrganizationId: string | undefined;
    if (hasOrgFields(body)) {
      const orgId = await upsertPublisherOrganization(body, publisher.id);
      if (orgId) {
        publisherOrganizationId = orgId;
      }
    }

    const patch: MissionUpdatePatch = {
      ...body,
      lastSyncAt: new Date(),
    };

    if ("description" in body) {
      Object.assign(patch, normalizeMissionDescriptionInput(body.description));
    }

    if (publisherOrganizationId !== undefined) {
      patch.publisherOrganizationId = publisherOrganizationId;
    }

    if ("places" in body) {
      patch.placesStatus = body.places ? "GIVEN_BY_PARTNER" : "ATTRIBUTED_BY_API";
    }

    if ("addresses" in body) {
      patch.addresses = buildAddresses(body.addresses);
    }

    if ("image" in body) {
      patch.domainLogo = body.image;
    }

    // Run moderation on the merged state (existing + patch) to avoid
    // false negatives on fields not included in the partial update
    const moderation = getModeration({ ...existing, ...patch });
    patch.statusCode = moderation.statusCode;
    patch.statusComment = moderation.statusComment;
    if ("description" in body && moderation.description !== undefined) {
      patch.description = moderation.description;
    }

    const mission = await missionService.update(existing.id, patch);
    // Recompute mission_diffusion sans attendre le rebuild 6h : une modif peut changer l'éligibilité
    // aux diffuseurs (organisation, domaine…). Chemin v2 uniquement (l'import XML passe aussi par
    // missionService.update). rebuildForMission est idempotent → no-op si l'éligibilité n'a pas bougé.
    await missionService.enqueueMissionDiffusion(mission.id);
    return res.status(200).send({ ok: true, data: buildData(mission) });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /v2/mission/:clientId — Soft delete
// ──────────────────────────────────────────────────────────────────────────────

router.delete(
  "/:clientId",
  passport.authenticate(["apikey", "api"], { session: false }),
  publisherRateLimiter,
  async (req: PublisherRequest, res: Response, next: NextFunction) => {
    try {
      const publisher = req.user as PublisherRecord;

      const params = missionClientIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
      }

      const existing = await missionService.findMissionByClientAndPublisher(params.data.clientId, publisher.id);
      if (!existing) {
        return res.status(404).send({ ok: false, code: NOT_FOUND });
      }

      // Idempotent: already deleted. On republie quand même une diffusion : rattrape d'éventuelles
      // lignes mission_diffusion laissées par un delete hors v2 (import XML) non encore purgées.
      if (existing.deletedAt) {
        await missionService.enqueueMissionProcessing(existing.id);
        await missionService.enqueueMissionDiffusion(existing.id);
        return res.status(200).send({ ok: true, data: { clientId: existing.clientId, deletedAt: existing.deletedAt } });
      }

      const deletedAt = new Date();
      await missionService.update(existing.id, { deletedAt });
      // Retire la mission de mission_diffusion sans attendre le rebuild 6h : rebuildForMission ne
      // matche plus (deletedAt != null) → toutes ses lignes sont supprimées, puis mission.index dé-indexe.
      await missionService.enqueueMissionDiffusion(existing.id);
      return res.status(200).send({ ok: true, data: { clientId: existing.clientId, deletedAt } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
