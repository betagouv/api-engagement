import publisherOrganizationService from "@/services/publisher-organization";
import { MissionAddress, MissionRecord } from "@/types/mission";
import { PublisherOrganizationRecord } from "@/types/publisher-organization";
import { normalizeRNA } from "@/utils/organization";
import { parseSiren } from "@/utils/parser";
import { deriveOrganizationClientId, getPublisherOrganizationChanges, OrganizationClientIdInput } from "@/utils/publisher-organization";

// ──────────────────────────────────────────────────────────────────────────────
// Org fields
// ──────────────────────────────────────────────────────────────────────────────

export interface OrgBody extends OrganizationClientIdInput {
  organizationDescription?: string;
  organizationUrl?: string;
  organizationType?: string;
  organizationLogo?: string;
  organizationSiret?: string;
  organizationFullAddress?: string;
  organizationPostCode?: string;
  organizationCity?: string;
  organizationDepartment?: string;
  organizationDepartmentCode?: string;
  organizationDepartmentName?: string;
  organizationStatusJuridique?: string;
  organizationBeneficiaries?: string[];
  organizationActions?: string[];
  organizationReseaux?: string[];
}

export const ORG_FIELD_KEYS: Array<keyof OrgBody> = [
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

export const hasOrgFields = (body: OrgBody): boolean => ORG_FIELD_KEYS.some((key) => body[key] !== undefined);

const parseOrganizationIdentifiers = (body: OrgBody) => {
  const fromSiret = parseSiren(body.organizationSiret ?? undefined);
  const fromSiren = parseSiren(body.organizationSiren ?? undefined);
  return {
    siret: fromSiret.siret ?? fromSiren.siret,
    siren: fromSiren.siren ?? fromSiret.siren,
  };
};

const buildOrgDataForCreate = (body: OrgBody) => {
  const { siret, siren } = parseOrganizationIdentifiers(body);
  return {
    name: body.organizationName ?? null,
    rna: normalizeRNA(body.organizationRNA) ?? null,
    siren: siren ?? null,
    siret: siret ?? null,
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
  };
};

const buildOrgDataForUpdate = (body: OrgBody) => {
  const parsedIdentifiers = body.organizationSiren !== undefined || body.organizationSiret !== undefined ? parseOrganizationIdentifiers(body) : null;
  return {
    ...(body.organizationName !== undefined ? { name: body.organizationName } : {}),
    ...(body.organizationRNA !== undefined ? { rna: normalizeRNA(body.organizationRNA) } : {}),
    ...(body.organizationSiren !== undefined || body.organizationSiret !== undefined ? { siren: parsedIdentifiers?.siren ?? null, siret: parsedIdentifiers?.siret ?? null } : {}),
    ...(body.organizationUrl !== undefined ? { url: body.organizationUrl } : {}),
    ...(body.organizationLogo !== undefined ? { logo: body.organizationLogo } : {}),
    ...(body.organizationDescription !== undefined ? { description: body.organizationDescription } : {}),
    ...(body.organizationStatusJuridique !== undefined ? { legalStatus: body.organizationStatusJuridique } : {}),
    ...(body.organizationType !== undefined ? { type: body.organizationType } : {}),
    ...(body.organizationActions !== undefined ? { actions: body.organizationActions } : {}),
    ...(body.organizationBeneficiaries !== undefined ? { beneficiaries: body.organizationBeneficiaries } : {}),
    ...(body.organizationReseaux !== undefined ? { parentOrganizations: body.organizationReseaux } : {}),
    ...(body.organizationFullAddress !== undefined ? { fullAddress: body.organizationFullAddress } : {}),
    ...(body.organizationPostCode !== undefined ? { postalCode: body.organizationPostCode } : {}),
    ...(body.organizationCity !== undefined ? { city: body.organizationCity } : {}),
  };
};

export const upsertPublisherOrganization = async (body: OrgBody, publisherId: string): Promise<string | null> => {
  const orgClientId = deriveOrganizationClientId(body);
  if (!orgClientId) {
    return null;
  }

  const existing = await publisherOrganizationService.findMany({ publisherId, clientId: orgClientId });
  if (existing[0]) {
    const orgData = buildOrgDataForUpdate(body);
    const mergedOrg = { ...existing[0], ...orgData };
    const changes = getPublisherOrganizationChanges(existing[0], mergedOrg as PublisherOrganizationRecord);
    if (changes) {
      await publisherOrganizationService.update(existing[0].id, orgData);
    }
    return existing[0].id;
  }

  const orgData = buildOrgDataForCreate(body);
  const created = await publisherOrganizationService.create({
    publisherId,
    clientId: orgClientId,
    ...orgData,
    verifiedAt: null,
    organizationIdVerified: null,
    verificationStatus: null,
  });
  return created.id;
};

// ──────────────────────────────────────────────────────────────────────────────
// Transformers
// ──────────────────────────────────────────────────────────────────────────────

export const buildAddresses = (addresses?: MissionAddress[]) => addresses?.map((a) => ({ ...a, geolocStatus: "SHOULD_ENRICH" }));

export const buildData = (mission: MissionRecord) => ({
  id: mission.id,
  clientId: mission.clientId,
  publisherId: mission.publisherId,
  statusCode: mission.statusCode,
  statusComment: mission.statusComment,
  createdAt: mission.createdAt,
  updatedAt: mission.updatedAt,
  deletedAt: mission.deletedAt,
  title: mission.title,
  description: mission.description,
  applicationUrl: mission.applicationUrl,
  image: mission.domainLogo,
  metadata: mission.metadata,
  postedAt: mission.postedAt,
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
