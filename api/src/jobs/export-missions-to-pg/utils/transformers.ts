import { PUBLISHER_IDS } from "../../../config";
import { MissionType, Address as PgAddress, Mission as PgMission } from "../../../db/analytics";
import { MissionRecord } from "../../../types/mission";
import { MissionTransformResult } from "../types";

/**
 * Transform a MongoDB mission into PostgreSQL format
 *
 * @param doc The mission to transform
 * @param partnerId The partner ID
 * @param organizationId The organization ID
 * @returns The transformed mission with addresses and history
 */
export const transformMongoMissionToPg = (doc: MissionRecord | null, partnerId: string, organizationId?: string): MissionTransformResult | null => {
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

  const oldId = (doc as any)._id ?? doc.id;

  const obj = {
    old_id: oldId?.toString() || "",
    title: doc.title,
    client_id: doc.clientId,
    description: doc.description,
    description_html: doc.descriptionHtml,
    application_url: doc.applicationUrl,
    tags: doc.tags,
    tasks: doc.tasks,
    domain: doc.domain,
    domain_logo: doc.domainLogo,
    audience: doc.audience || [],
    soft_skills: doc.softSkills || doc.soft_skills || [],
    rome_skills: doc.romeSkills || [],
    requirements: doc.requirements || [],
    close_to_transport: doc.closeToTransport,
    reduced_mobility_accessible: doc.reducedMobilityAccessible,
    open_to_minors: doc.openToMinors,
    remote: doc.remote,
    schedule: doc.schedule,
    duration: doc.duration,
    posted_at: toDate(doc.postedAt),
    start_at: toDate(doc.startAt),
    end_at: toDate(doc.endAt),
    priority: doc.priority,
    places: doc.places,
    places_status: doc.placesStatus,
    metadata: doc.metadata,
    activity: doc.activity,
    type: getMissionType(doc.type),
    snu: doc.snu,
    snu_places: doc.snuPlaces,
    compensation_amount: doc.compensationAmount,
    compensation_unit: doc.compensationUnit,
    compensation_type: doc.compensationType,

    address: doc.address ? doc.address.toString() : "",
    postal_code: doc.postalCode ? doc.postalCode.toString() : "",
    city: doc.city,
    department_name: doc.departmentName,
    department_code: doc.departmentCode ? doc.departmentCode.toString() : "",
    region: doc.region,
    country: doc.country,
    latitude: doc.location?.lat ?? null,
    longitude: doc.location?.lon ?? null,
    geoloc_status: (doc as any).geolocStatus,
    organization_url: doc.organizationUrl,
    organization_name: doc.organizationName,
    organization_logo: doc.organizationLogo,
    organization_client_id: doc.organizationClientId,
    organization_description: doc.organizationDescription,
    organization_rna: doc.organizationRNA,
    organization_siren: doc.organizationSiren,
    organization_full_address: doc.organizationFullAddress,
    organization_city: doc.organizationCity,
    organization_department: doc.organizationDepartment,
    organization_postal_code: doc.organizationPostCode,
    organization_status_juridique: doc.organizationStatusJuridique,
    organization_beneficiaries: doc.organizationBeneficiaries,
    organization_reseaux: doc.organizationReseaux,
    organization_actions: doc.organizationActions || [],
    rna_status: (doc as any).rnaStatus,

    matched_organization_id: organizationId || null,
    organization_verification_status: doc.organizationVerificationStatus,
    organization_name_verified: doc.organizationNameVerified,
    organization_rna_verified: doc.organizationRNAVerified,
    organization_siren_verified: doc.organizationSirenVerified,
    organization_siret_verified: doc.organizationSiretVerified,
    organization_address_verified: doc.organizationAddressVerified,
    organization_city_verified: doc.organizationCityVerified,
    organization_postal_code_verified: doc.organizationPostalCodeVerified,
    organization_department_code_verified: doc.organizationDepartmentCodeVerified,
    organization_department_name_verified: doc.organizationDepartmentNameVerified,
    organization_region_verified: doc.organizationRegionVerified,

    is_rna_verified: doc.organizationRNAVerified ? true : false,
    is_siren_verified: doc.organizationSirenVerified ? true : false,
    is_siret_verified: doc.organizationSiretVerified ? true : false,

    partner_id: partnerId,
    last_sync_at: toDate(doc.lastSyncAt || doc.updatedAt) || new Date(),
    status: doc.statusCode,
    status_comment: doc.statusComment,

    jva_moderation_status: doc[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`],
    jva_moderation_comment: doc[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_comment`],
    jva_moderation_title: doc[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_title`],
    jva_moderation_updated_at:
      doc[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_date`] !== undefined ? new Date(doc[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_date`] as string | number | Date) : undefined,

    leboncoin_moderation_status: doc.leboncoinStatus,
    leboncoin_moderation_comment: doc.leboncoinComment,
    leboncoin_moderation_url: doc.leboncoinUrl,
    leboncoin_moderation_updated_at: doc.leboncoinUpdatedAt ? new Date(doc.leboncoinUpdatedAt) : null,

    created_at: toDate(doc.createdAt) ?? new Date(),
    updated_at: toDate(doc.updatedAt) ?? new Date(),
    deleted_at: toDate(doc.deletedAt),
  } as PgMission;

  // Transform addresses
  const addresses: PgAddress[] = doc.addresses?.map(
    (address) =>
      ({
        old_id: (address as any)._id?.toString() || address.id || "",
        street: address.street,
        city: address.city,
        postal_code: address.postalCode,
        department_code: address.departmentCode,
        department_name: address.departmentName,
        region: address.region,
        country: address.country,
        latitude: address.location?.lat || null,
        longitude: address.location?.lon || null,
        geoloc_status: address.geolocStatus,
      }) as PgAddress
  );

  return { mission: obj, addresses };
};

const getMissionType = (type?: string | null) => {
  if (type === "volontariat_service_civique") {
    return MissionType.volontariat_service_civique;
  }
  return MissionType.benevolat;
};
