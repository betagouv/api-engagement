import { PUBLISHER_IDS } from "../../../config";
import { MissionType, Prisma } from "../../../db/analytics";
import { MissionRecord } from "../../../types/mission";
import { MissionTransformResult } from "../types";

/**
 * Transform a MissionRecord object into PostgreSQL format
 *
 * @param doc The mission to transform
 * @param partnerId The partner ID
 * @param organizationId The organization ID
 * @returns The transformed mission with addresses and history
 */
export const transformMissionRecordToPg = (doc: MissionRecord | null, partnerId: string, organizationId?: string): MissionTransformResult | null => {
  if (!doc) {
    return null;
  }

  const toDate = (value: Date | string | null | undefined) => {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  const toNullableString = (value: unknown): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === "number" || typeof value === "boolean" || value instanceof Date) {
      return String(value);
    }
    try {
      const str = String(value);
      return str && str !== "[object Object]" ? str : null;
    } catch {
      return null;
    }
  };

  const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((v) => toNullableString(v))
      .filter((v): v is string => Boolean(v));
  };

  const toNullableJsonString = (value: unknown): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  };

  const toNullableInt = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  };

  const toNullableFloat = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const oldId = (doc as any)._id ?? doc.id;
  const leboncoin = doc.jobBoards?.LEBONCOIN;

  const oldIdStr = toNullableString(oldId) ?? "";
  if (!oldIdStr) {
    return null;
  }
  const audience = toStringArray((doc as any).audience);
  const tags = toStringArray((doc as any).tags);
  const tasks = toStringArray((doc as any).tasks);
  const softSkills = toStringArray((doc as any).softSkills ?? (doc as any).soft_skills);
  const romeSkills = toStringArray((doc as any).romeSkills);
  const requirements = toStringArray((doc as any).requirements);
  const organizationActions = toStringArray((doc as any).organizationActions);
  const organizationBeneficiaries = toStringArray((doc as any).organizationBeneficiaries);
  const organizationReseaux = toStringArray((doc as any).organizationReseaux);

  const missionCreate: Prisma.MissionUncheckedCreateInput = {
    old_id: oldIdStr,
    title: toNullableString(doc.title),
    client_id: toNullableString(doc.clientId),
    description: toNullableString(doc.description),
    description_html: toNullableString(doc.descriptionHtml),
    application_url: toNullableString(doc.applicationUrl),
    tags,
    tasks,
    domain: toNullableString(doc.domain) ?? "inconnu",
    domain_logo: toNullableString(doc.domainLogo),
    audience,
    soft_skills: softSkills,
    rome_skills: romeSkills,
    requirements,
    close_to_transport: toNullableString((doc as any).closeToTransport),
    reduced_mobility_accessible: toNullableString((doc as any).reducedMobilityAccessible),
    open_to_minors: toNullableString((doc as any).openToMinors),
    remote: toNullableString((doc as any).remote),
    schedule: toNullableString((doc as any).schedule),
    duration: toNullableInt((doc as any).duration),
    posted_at: toDate((doc as any).postedAt),
    start_at: toDate((doc as any).startAt),
    end_at: toDate((doc as any).endAt),
    priority: toNullableString((doc as any).priority),
    places: toNullableInt((doc as any).places),
    places_status: toNullableString((doc as any).placesStatus),
    metadata: toNullableJsonString((doc as any).metadata),
    activity: toNullableString((doc as any).activity),
    type: getMissionType((doc as any).type),
    snu: (doc as any).snu ?? null,
    snu_places: toNullableInt((doc as any).snuPlaces),
    compensation_amount: toNullableFloat((doc as any).compensationAmount),
    compensation_unit: toNullableString((doc as any).compensationUnit),
    compensation_type: toNullableString((doc as any).compensationType),

    address: toNullableString((doc as any).address),
    postal_code: toNullableString((doc as any).postalCode),
    city: toNullableString((doc as any).city),
    department_name: toNullableString((doc as any).departmentName),
    department_code: toNullableString((doc as any).departmentCode),
    region: toNullableString((doc as any).region),
    country: toNullableString((doc as any).country),
    latitude: (doc as any).location?.lat ?? null,
    longitude: (doc as any).location?.lon ?? null,
    geoloc_status: toNullableString((doc as any).geolocStatus),
    organization_url: toNullableString((doc as any).organizationUrl),
    organization_name: toNullableString((doc as any).organizationName),
    organization_logo: toNullableString((doc as any).organizationLogo),
    organization_client_id: toNullableString((doc as any).organizationClientId),
    organization_description: toNullableString((doc as any).organizationDescription),
    organization_rna: toNullableString((doc as any).organizationRNA),
    organization_siren: toNullableString((doc as any).organizationSiren),
    organization_full_address: toNullableString((doc as any).organizationFullAddress),
    organization_city: toNullableString((doc as any).organizationCity),
    organization_department: toNullableString((doc as any).organizationDepartment),
    organization_postal_code: toNullableString((doc as any).organizationPostCode),
    organization_status_juridique: toNullableString((doc as any).organizationStatusJuridique),
    organization_beneficiaries: organizationBeneficiaries,
    organization_reseaux: organizationReseaux,
    organization_actions: organizationActions,
    rna_status: toNullableString((doc as any).rnaStatus),

    matched_organization_id: organizationId || null,
    organization_verification_status: toNullableString((doc as any).organizationVerificationStatus),
    organization_name_verified: toNullableString((doc as any).organizationNameVerified),
    organization_rna_verified: toNullableString((doc as any).organizationRNAVerified),
    organization_siren_verified: toNullableString((doc as any).organizationSirenVerified),
    organization_siret_verified: toNullableString((doc as any).organizationSiretVerified),
    organization_address_verified: toNullableString((doc as any).organizationAddressVerified),
    organization_city_verified: toNullableString((doc as any).organizationCityVerified),
    organization_postal_code_verified: toNullableString((doc as any).organizationPostalCodeVerified),
    organization_department_code_verified: toNullableString((doc as any).organizationDepartmentCodeVerified),
    organization_department_name_verified: toNullableString((doc as any).organizationDepartmentNameVerified),
    organization_region_verified: toNullableString((doc as any).organizationRegionVerified),

    is_rna_verified: Boolean((doc as any).organizationRNAVerified),
    is_siren_verified: Boolean((doc as any).organizationSirenVerified),
    is_siret_verified: Boolean((doc as any).organizationSiretVerified),

    partner_id: partnerId,
    last_sync_at: toDate((doc as any).lastSyncAt || (doc as any).updatedAt) || new Date(),
    status: toNullableString((doc as any).statusCode),
    status_comment: toNullableString((doc as any).statusComment),

    jva_moderation_status: toNullableString((doc as any)[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`]),
    jva_moderation_comment: toNullableString((doc as any)[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_comment`]),
    jva_moderation_title: toNullableString((doc as any)[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_title`]),
    jva_moderation_updated_at: toDate((doc as any)[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_date`] as Date | string | null | undefined),

    leboncoin_moderation_status: toNullableString(leboncoin?.status ?? null),
    leboncoin_moderation_comment: toNullableString(leboncoin?.comment ?? null),
    leboncoin_moderation_url: toNullableString(leboncoin?.url ?? null),
    leboncoin_moderation_updated_at: toDate(leboncoin?.updatedAt ?? null),

    created_at: toDate((doc as any).createdAt) ?? new Date(),
    updated_at: toDate((doc as any).updatedAt) ?? new Date(),
    deleted_at: toDate((doc as any).deletedAt),
  };

  const missionUpdate: Prisma.MissionUncheckedUpdateInput = {
    title: missionCreate.title,
    client_id: missionCreate.client_id,
    description: missionCreate.description,
    description_html: missionCreate.description_html,
    application_url: missionCreate.application_url,
    domain: missionCreate.domain,
    domain_logo: missionCreate.domain_logo,
    activity: missionCreate.activity,
    type: missionCreate.type,
    duration: missionCreate.duration,
    deleted_at: missionCreate.deleted_at,
    open_to_minors: missionCreate.open_to_minors,
    organization_city: missionCreate.organization_city,
    organization_description: missionCreate.organization_description,
    organization_logo: missionCreate.organization_logo,
    organization_name: missionCreate.organization_name,
    organization_rna: missionCreate.organization_rna,
    organization_siren: missionCreate.organization_siren,
    organization_status_juridique: missionCreate.organization_status_juridique,
    organization_url: missionCreate.organization_url,
    organization_full_address: missionCreate.organization_full_address,
    schedule: missionCreate.schedule,
    remote: missionCreate.remote,
    last_sync_at: missionCreate.last_sync_at,
    status: missionCreate.status,
    status_comment: missionCreate.status_comment,
    posted_at: missionCreate.posted_at,
    close_to_transport: missionCreate.close_to_transport,
    reduced_mobility_accessible: missionCreate.reduced_mobility_accessible,
    start_at: missionCreate.start_at,
    end_at: missionCreate.end_at,
    rna_status: missionCreate.rna_status,
    snu: missionCreate.snu,
    snu_places: missionCreate.snu_places,
    compensation_amount: missionCreate.compensation_amount,
    compensation_unit: missionCreate.compensation_unit,
    compensation_type: missionCreate.compensation_type,
    organization_client_id: missionCreate.organization_client_id,
    organization_department: missionCreate.organization_department,
    metadata: missionCreate.metadata,
    organization_postal_code: missionCreate.organization_postal_code,
    priority: missionCreate.priority,
    places: missionCreate.places,
    places_status: missionCreate.places_status,
    matched_organization_id: missionCreate.matched_organization_id,
    organization_verification_status: missionCreate.organization_verification_status,
    organization_name_verified: missionCreate.organization_name_verified,
    organization_rna_verified: missionCreate.organization_rna_verified,
    organization_siren_verified: missionCreate.organization_siren_verified,
    organization_siret_verified: missionCreate.organization_siret_verified,
    organization_address_verified: missionCreate.organization_address_verified,
    organization_city_verified: missionCreate.organization_city_verified,
    organization_postal_code_verified: missionCreate.organization_postal_code_verified,
    organization_department_code_verified: missionCreate.organization_department_code_verified,
    organization_department_name_verified: missionCreate.organization_department_name_verified,
    organization_region_verified: missionCreate.organization_region_verified,
    is_siren_verified: missionCreate.is_siren_verified,
    is_siret_verified: missionCreate.is_siret_verified,
    is_rna_verified: missionCreate.is_rna_verified,
    partner_id: missionCreate.partner_id,
    address: missionCreate.address,
    postal_code: missionCreate.postal_code,
    city: missionCreate.city,
    department_name: missionCreate.department_name,
    department_code: missionCreate.department_code,
    region: missionCreate.region,
    country: missionCreate.country,
    latitude: missionCreate.latitude,
    longitude: missionCreate.longitude,
    geoloc_status: missionCreate.geoloc_status,

    audience: { set: audience },
    tags: { set: tags },
    tasks: { set: tasks },
    soft_skills: { set: softSkills },
    rome_skills: { set: romeSkills },
    requirements: { set: requirements },
    organization_actions: { set: organizationActions },
    organization_beneficiaries: { set: organizationBeneficiaries },
    organization_reseaux: { set: organizationReseaux },

    jva_moderation_status: missionCreate.jva_moderation_status,
    jva_moderation_comment: missionCreate.jva_moderation_comment,
    jva_moderation_title: missionCreate.jva_moderation_title,
    jva_moderation_updated_at: missionCreate.jva_moderation_updated_at,
    leboncoin_moderation_status: missionCreate.leboncoin_moderation_status,
    leboncoin_moderation_comment: missionCreate.leboncoin_moderation_comment,
    leboncoin_moderation_updated_at: missionCreate.leboncoin_moderation_updated_at,
    leboncoin_moderation_url: missionCreate.leboncoin_moderation_url,

    updated_at: missionCreate.updated_at,
  };

  // Transform addresses
  const addresses: Omit<Prisma.AddressCreateManyInput, "mission_id">[] = (doc.addresses ?? []).map((address, index) => {
    const addressOldId = toNullableString((address as any)._id ?? address.id) ?? `${oldIdStr}:${index}`;
    return {
      old_id: addressOldId,
      street: toNullableString(address.street),
      city: toNullableString(address.city),
      postal_code: toNullableString(address.postalCode),
      department_code: toNullableString(address.departmentCode),
      department_name: toNullableString(address.departmentName),
      region: toNullableString(address.region),
      country: toNullableString(address.country),
      latitude: address.location?.lat ?? null,
      longitude: address.location?.lon ?? null,
      geoloc_status: toNullableString((address as any).geolocStatus) ?? undefined,
    };
  });

  return { missionCreate, missionUpdate, addresses };
};

const getMissionType = (type?: string | null) => {
  if (type === "volontariat_service_civique") {
    return MissionType.volontariat_service_civique;
  }
  return MissionType.benevolat;
};
