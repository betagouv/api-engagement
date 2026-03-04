import { NextFunction, Response, Router } from "express";
import passport from "passport";

import { INVALID_BODY, INVALID_PARAMS, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "@/error";
import { missionWriteLimiter } from "@/middlewares/rate-limit";
import { missionService } from "@/services/mission";
import publisherOrganizationService from "@/services/publisher-organization";
import { MissionCreateInput, MissionRecord, MissionUpdatePatch } from "@/types/mission";
import { PublisherRequest } from "@/types/passport";
import { PublisherRecord } from "@/types/publisher";

import { MissionCreateBody, MissionUpdateBody, missionClientIdParamSchema, missionCreateSchema, missionUpdateSchema } from "./schema";

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const ORG_FIELD_KEYS: Array<keyof MissionCreateBody> = [
  "organizationClientId",
  "organizationName",
  "organizationDescription",
  "organizationUrl",
  "organizationType",
  "organizationLogo",
  "organizationRNA",
  "organizationSiren",
  "organizationSiret",
  "organizationFullAddress",
  "organizationPostCode",
  "organizationCity",
  "organizationDepartment",
  "organizationDepartmentCode",
  "organizationDepartmentName",
  "organizationStatusJuridique",
  "organizationBeneficiaries",
  "organizationActions",
  "organizationReseaux",
];

const hasOrgFields = (body: MissionCreateBody | MissionUpdateBody): boolean => ORG_FIELD_KEYS.some((key) => body[key] !== undefined);

const deriveOrgClientId = (body: MissionCreateBody | MissionUpdateBody): string | null => {
  if (body.organizationClientId) {
    return body.organizationClientId;
  }
  if (body.organizationRNA) {
    return body.organizationRNA.replace(/\s+/g, "").toUpperCase();
  }
  if (body.organizationSiren) {
    return body.organizationSiren.replace(/\s+/g, "");
  }
  if (body.organizationName) {
    return body.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .substring(0, 100);
  }
  return null;
};

const upsertPublisherOrganization = async (body: MissionCreateBody | MissionUpdateBody, publisherId: string): Promise<string | null> => {
  const orgClientId = deriveOrgClientId(body);
  if (!orgClientId) {
    return null;
  }

  const orgData = {
    publisherId,
    clientId: orgClientId,
    name: body.organizationName ?? null,
    rna: body.organizationRNA ?? null,
    siren: body.organizationSiren ?? null,
    siret: body.organizationSiret ?? null,
    url: body.organizationUrl ?? null,
    logo: body.organizationLogo ?? null,
    description: body.organizationDescription ?? null,
    legalStatus: body.organizationStatusJuridique ?? null,
    type: body.organizationType ?? null,
    actions: body.organizationActions ?? [],
    beneficiaries: body.organizationBeneficiaries ?? [],
    parentOrganizations: body.organizationReseaux ?? [],
    fullAddress: body.organizationFullAddress ?? null,
    postalCode: body.organizationPostCode ?? null,
    city: body.organizationCity ?? null,
    verifiedAt: null,
    organizationIdVerified: null,
    verificationStatus: null,
  };

  const existing = await publisherOrganizationService.findMany({ publisherId, clientId: orgClientId });
  if (existing[0]) {
    await publisherOrganizationService.update(existing[0].id, orgData);
    return existing[0].id;
  }

  const created = await publisherOrganizationService.create(orgData);
  return created.id;
};

type AddressInput = NonNullable<MissionCreateBody["addresses"]>[number];

const buildAddresses = (addresses: MissionCreateBody["addresses"]) => addresses?.map((a: AddressInput) => ({ ...a, geolocStatus: "SHOULD_ENRICH" }));

const buildData = (mission: MissionRecord) => ({
  id: mission.id,
  clientId: mission.clientId,
  publisherId: mission.publisherId,
  statusCode: mission.statusCode,
  createdAt: mission.createdAt,
  updatedAt: mission.updatedAt,
  deletedAt: mission.deletedAt,
  title: mission.title,
  description: mission.description,
  applicationUrl: mission.applicationUrl,
  domain: mission.domain,
  activities: mission.activities,
  tags: mission.tags,
  tasks: mission.tasks,
  audience: mission.audience,
  requirements: mission.requirements,
  softSkills: mission.softSkills,
  romeSkills: mission.romeSkills,
  remote: mission.remote,
  schedule: mission.schedule,
  startAt: mission.startAt,
  endAt: mission.endAt,
  priority: mission.priority,
  places: mission.places,
  compensationAmount: mission.compensationAmount,
  compensationUnit: mission.compensationUnit,
  compensationType: mission.compensationType,
  openToMinors: mission.openToMinors,
  reducedMobilityAccessible: mission.reducedMobilityAccessible,
  closeToTransport: mission.closeToTransport,
  addresses: mission.addresses,
  type: mission.type,
  organizationClientId: mission.organizationClientId,
  organizationName: mission.organizationName,
  organizationDescription: mission.organizationDescription,
  organizationUrl: mission.organizationUrl,
  organizationType: mission.organizationType,
  organizationLogo: mission.organizationLogo,
  organizationRNA: mission.organizationRNA,
  organizationSiren: mission.organizationSiren,
  organizationSiret: mission.organizationSiret,
  organizationFullAddress: mission.organizationFullAddress,
  organizationPostCode: mission.organizationPostCode,
  organizationCity: mission.organizationCity,
  organizationStatusJuridique: mission.organizationStatusJuridique,
  organizationBeneficiaries: mission.organizationBeneficiaries,
  organizationActions: mission.organizationActions,
  organizationReseaux: mission.organizationReseaux,
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /v2/mission — Create
// ──────────────────────────────────────────────────────────────────────────────

router.post("/", passport.authenticate(["apikey", "api"], { session: false }), missionWriteLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
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

    const mission = await missionService.create(input);
    return res.status(201).send({ ok: true, data: buildData(mission) });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /v2/mission/:clientId — Update (PATCH semantics)
// ──────────────────────────────────────────────────────────────────────────────

router.put("/:clientId", passport.authenticate(["apikey", "api"], { session: false }), missionWriteLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
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

    const mission = await missionService.update(existing.id, patch);
    return res.status(200).send({ ok: true, data: buildData(mission) });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /v2/mission/:clientId — Soft delete
// ──────────────────────────────────────────────────────────────────────────────

router.delete("/:clientId", passport.authenticate(["apikey", "api"], { session: false }), missionWriteLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
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
