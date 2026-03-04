import publisherOrganizationService from "@/services/publisher-organization";
import { MissionAddress, MissionRecord } from "@/types/mission";

// ──────────────────────────────────────────────────────────────────────────────
// Org fields
// ──────────────────────────────────────────────────────────────────────────────

export interface OrgBody {
  organizationClientId?: string;
  organizationName?: string;
  organizationDescription?: string;
  organizationUrl?: string;
  organizationType?: string;
  organizationLogo?: string;
  organizationRNA?: string;
  organizationSiren?: string;
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

export const deriveOrgClientId = (body: OrgBody): string | null => {
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

export const upsertPublisherOrganization = async (body: OrgBody, publisherId: string): Promise<string | null> => {
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

// ──────────────────────────────────────────────────────────────────────────────
// Transformers
// ──────────────────────────────────────────────────────────────────────────────

export const buildAddresses = (addresses?: MissionAddress[]) => addresses?.map((a) => ({ ...a, geolocStatus: "SHOULD_ENRICH" }));

export const buildData = (mission: MissionRecord) => ({
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
