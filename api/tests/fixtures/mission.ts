import { randomUUID } from "node:crypto";

import { prismaCore } from "../../src/db/postgres";
import { missionService } from "../../src/services/mission";
import { missionModerationStatusService } from "../../src/services/mission-moderation-status";
import { organizationService } from "../../src/services/organization";
import { MissionType, type MissionCreateInput, type MissionRecord } from "../../src/types";
import type { MissionAddress } from "../../src/types/mission";
import { createTestPublisher } from "./publisher";

const ensurePublisherExists = async (publisherId: string) => {
  const existing = await prismaCore.publisher.findUnique({ where: { id: publisherId } });
  if (existing) {
    return existing;
  }
  return prismaCore.publisher.create({
    data: {
      id: publisherId,
      name: `Publisher ${publisherId}`,
      hasApiRights: true,
      hasWidgetRights: true,
      hasCampaignRights: true,
    },
  });
};

const buildDefaultAddress = (override: MissionAddress = {}): MissionAddress => ({
  street: "123 Test Street",
  postalCode: "12345",
  departmentCode: "12",
  departmentName: "Test Department",
  city: "Test City",
  region: "Test Region",
  country: "Test Country",
  location: { lat: 0, lon: 0 },
  geolocStatus: "NOT_FOUND",
  ...override,
});

export const createTestMission = async (data: Partial<MissionCreateInput & { deleted?: boolean }> = {}): Promise<MissionRecord> => {
  const normalizeAddress = (address: MissionAddress): MissionAddress => {
    const departmentCode = (address as any).departmentCode;
    const postalCode = (address as any).postalCode;
    return {
      ...address,
      departmentCode: departmentCode !== undefined && departmentCode !== null ? String(departmentCode) : (address.departmentCode ?? null),
      postalCode: postalCode !== undefined && postalCode !== null ? String(postalCode) : (address.postalCode ?? null),
    };
  };

  const publisher = data.publisherId ? await ensurePublisherExists(data.publisherId) : await createTestPublisher();

  let organizationId = data.organizationId ?? null;

  if (data.organizationId) {
    const existingOrg = await prismaCore.organization.findUnique({ where: { id: data.organizationId } });
    if (!existingOrg && (data.organizationName || data.organizationRNA || data.organizationSiren || data.organizationStatusJuridique)) {
      const created = await organizationService.createOrganization({
        id: data.organizationId,
        title: data.organizationName ?? "Organization name",
        rna: data.organizationRNA ?? undefined,
        siren: data.organizationSiren ?? undefined,
        status: data.organizationStatusJuridique ?? (data as any).organizationType ?? undefined,
        addressCity: data.organizationCity ?? undefined,
        addressPostalCode: data.organizationPostCode ?? undefined,
        addressDepartmentName: data.organizationDepartmentName ?? undefined,
        addressDepartmentCode: data.organizationDepartmentCode ?? undefined,
      });
      organizationId = created.id;
    }
  }

  if (!organizationId && (data.organizationName || data.organizationRNA || data.organizationSiren || data.organizationStatusJuridique || data.organizationClientId)) {
    const organization = await organizationService.createOrganization({
      id: randomUUID(),
      title: data.organizationName ?? "Organization name",
      rna: data.organizationRNA ?? undefined,
      siren: data.organizationSiren ?? undefined,
      status: data.organizationStatusJuridique ?? (data as any).organizationType ?? undefined,
      addressCity: data.organizationCity ?? undefined,
      addressPostalCode: data.organizationPostCode ?? undefined,
      addressDepartmentName: data.organizationDepartmentName ?? undefined,
      addressDepartmentCode: data.organizationDepartmentCode ?? undefined,
    });
    organizationId = organization.id;
  }

  const addressOverride: MissionAddress = data.addresses?.[0] ?? {
    street: (data as any).address ?? undefined,
    postalCode: (data as any).postalCode ?? undefined,
    departmentName: (data as any).departmentName ?? undefined,
    departmentCode: (data as any).departmentCode ?? undefined,
    city: (data as any).city ?? undefined,
    region: (data as any).region ?? undefined,
    country: (data as any).country ?? undefined,
    location: (data as any).location ?? undefined,
    geolocStatus: (data as any).geolocStatus ?? undefined,
  };

  const defaultAddress = buildDefaultAddress(addressOverride);
  const addresses = (data.addresses ?? [defaultAddress]).map(normalizeAddress);

  const missionInput: MissionCreateInput = {
    id: data.id,
    clientId: data.clientId ?? `client-${randomUUID()}`,
    publisherId: publisher.id,
    title: data.title ?? "Test Mission",
    description: data.description ?? "Test Mission Description",
    descriptionHtml: data.descriptionHtml ?? "Test Mission Description<br/>Html",
    tags: data.tags ?? ["tag1", "tag2"],
    tasks: data.tasks ?? ["task1", "task2"],
    audience: data.audience ?? ["18-24 ans", "25-34 ans"],
    softSkills: data.softSkills ?? ["Travail en équipe", "Communication"],
    soft_skills: data.soft_skills,
    requirements: data.requirements ?? ["Pré-requis 1", "Pré-requis 2"],
    romeSkills: data.romeSkills ?? ["123456"],
    reducedMobilityAccessible: data.reducedMobilityAccessible ?? true,
    closeToTransport: data.closeToTransport ?? true,
    openToMinors: data.openToMinors ?? true,
    remote: data.remote ?? "no",
    schedule: data.schedule ?? "1 jour par semaine",
    duration: data.duration ?? 1,
    postedAt: data.postedAt ?? new Date(),
    startAt: data.startAt ?? new Date(),
    endAt: data.endAt ?? new Date(),
    priority: data.priority ?? "high",
    places: data.places ?? 10,
    placesStatus: data.placesStatus ?? "GIVEN_BY_PARTNER",
    metadata: data.metadata ?? "metadata",
    domain: data.domain ?? "bricolage",
    domainOriginal: data.domainOriginal,
    domainLogo: data.domainLogo ?? "https://example.com/logo.png",
    activity: data.activity ?? "environnement",
    type: data.type ?? MissionType.BENEVOLAT,
    snu: data.snu ?? false,
    snuPlaces: data.snuPlaces ?? 0,
    compensationAmount: data.compensationAmount ?? null,
    compensationUnit: data.compensationUnit ?? null,
    compensationType: data.compensationType ?? null,
    organizationClientId: data.organizationClientId ?? (organizationId ? `org-${organizationId}` : "6789"),
    organizationId: organizationId ?? undefined,
    lastSyncAt: data.lastSyncAt ?? new Date(),
    applicationUrl: data.applicationUrl ?? `https://api.api-engagement.gouv.fr/mission-id/${publisher.id}`,
    statusCode: data.statusCode ?? "ACCEPTED",
    statusComment: data.statusComment ?? "Status comment",
    deletedAt: data.deleted ? (data.deletedAt ?? new Date()) : (data.deletedAt ?? undefined),
    lastExportedToPgAt: data.lastExportedToPgAt,
    addresses,
  };

  const mission = await missionService.create(missionInput);

  const defaultModerationPublisherId = "5f5931496c7ea514150a818f";
  await missionModerationStatusService.create({
    mission: { connect: { id: mission.id } },
    publisherId: defaultModerationPublisherId,
    status: (data as any).moderationStatus ?? "PENDING",
    comment: (data as any).moderationComment ?? null,
    note: (data as any).moderationNote ?? null,
    title: (data as any).moderationTitle ?? null,
  });

  if (data.createdAt || data.updatedAt) {
    const createdAt = data.createdAt ?? mission.createdAt;
    const updatedAt = data.updatedAt ?? mission.updatedAt;
    await prismaCore.$executeRaw`UPDATE "mission" SET "created_at" = ${createdAt}, "updated_at" = ${updatedAt} WHERE "id" = ${mission.id}`;
    const refreshed = await missionService.findOneMission(mission.id);
    if (refreshed) {
      return refreshed;
    }
  }

  const missionWithModeration = await missionService.findOneMission(mission.id);

  return missionWithModeration ?? mission;
};
