import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "@/error";
import { defaultRateLimiter } from "@/middlewares/rate-limit";
import { missionService } from "@/services/mission";
import { MissionCreateInput, MissionRecord, MissionUpdatePatch } from "@/types/mission";
import { PublisherRequest } from "@/types/passport";
import { PublisherRecord } from "@/types/publisher";
import { getModeration } from "@/utils/mission-moderation";

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
  domain: zod.string().optional(),
  activities: zod.array(zod.string()).optional(),
  tags: zod.array(zod.string()).optional(),
  tasks: zod.array(zod.string()).optional(),
  audience: zod.array(zod.string()).optional(),
  requirements: zod.array(zod.string()).optional(),
  softSkills: zod.array(zod.string()).optional(),
  romeSkills: zod.array(zod.string()).optional(),
  remote: zod.enum(["no", "possible", "full"]).optional(),
  schedule: zod.string().optional(),
  startAt: zod.coerce.date().optional(),
  endAt: zod.coerce.date().optional(),
  priority: zod.string().optional(),
  places: zod.number().int().positive().optional(),
  compensationAmount: zod.number().optional(),
  compensationUnit: zod.enum(["hour", "day", "month", "year"]).optional(),
  compensationType: zod.enum(["gross", "net"]).optional(),
  openToMinors: zod.boolean().optional(),
  reducedMobilityAccessible: zod.boolean().optional(),
  closeToTransport: zod.boolean().optional(),
  addresses: zod.array(addressSchema).optional(),
  type: zod.enum(["benevolat", "volontariat_service_civique", "volontariat_sapeurs_pompiers"]).optional(),
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

// ──────────────────────────────────────────────────────────────────────────────
// POST /v2/mission — Create
// ──────────────────────────────────────────────────────────────────────────────

router.post("/", passport.authenticate(["apikey", "api"], { session: false }), defaultRateLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const publisher = req.user as PublisherRecord;

    const parsed = missionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: parsed.error });
    }
    const body = parsed.data;

    const existing = await missionService.findMissionByClientAndPublisher(body.clientId, publisher.id);
    if (existing && !existing.deletedAt) {
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
      description: body.description,
      applicationUrl: body.applicationUrl,
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
      places: body.places,
      compensationAmount: body.compensationAmount,
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

    getModeration(input);

    const mission = await missionService.create(input);
    return res.status(201).send({ ok: true, data: buildData(mission) });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /v2/mission/:clientId — Update (PATCH semantics)
// ──────────────────────────────────────────────────────────────────────────────

router.put("/:clientId", passport.authenticate(["apikey", "api"], { session: false }), defaultRateLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
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

    if (publisherOrganizationId !== undefined) {
      patch.publisherOrganizationId = publisherOrganizationId;
    }

    if ("places" in body) {
      patch.placesStatus = body.places ? "GIVEN_BY_PARTNER" : "ATTRIBUTED_BY_API";
    }

    if ("addresses" in body) {
      patch.addresses = buildAddresses(body.addresses);
    }

    // Run moderation on the merged state (existing + patch) to avoid
    // false negatives on fields not included in the partial update
    const missionForModeration: Partial<MissionRecord> = { ...existing, ...patch };
    getModeration(missionForModeration);
    patch.statusCode = missionForModeration.statusCode;
    patch.statusComment = missionForModeration.statusComment ?? "";
    if ("description" in body) {
      patch.description = missionForModeration.description;
    }

    const mission = await missionService.update(existing.id, patch);
    return res.status(200).send({ ok: true, data: buildData(mission) });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /v2/mission/:clientId — Soft delete
// ──────────────────────────────────────────────────────────────────────────────

router.delete("/:clientId", passport.authenticate(["apikey", "api"], { session: false }), defaultRateLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
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

    // Idempotent: already deleted
    if (existing.deletedAt) {
      return res.status(200).send({ ok: true, data: { clientId: existing.clientId, deletedAt: existing.deletedAt } });
    }

    const deletedAt = new Date();
    await missionService.update(existing.id, { deletedAt });
    return res.status(200).send({ ok: true, data: { clientId: existing.clientId, deletedAt } });
  } catch (error) {
    next(error);
  }
});

export default router;
