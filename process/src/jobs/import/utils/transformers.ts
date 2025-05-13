import { MissionHistoryEventType, Organization, Address as PgAddress, Mission as PgMission, MissionHistoryEvent as PgMissionHistoryEvent } from "@prisma/client";
import { JVA_ID, SC_ID } from "../../../config";
import { Mission as MongoMission } from "../../../types";

type MissionHistoryEntry = Omit<PgMissionHistoryEvent, "id">; // Prisma renders uuid when saving

export type MissionTransformResult = {
  mission: PgMission;
  addresses: PgAddress[];
  history: MissionHistoryEntry[];
};

/**
 * Transform a MongoDB mission into PostgreSQL format
 */
export const transformMongoMissionToPg = (doc: MongoMission, partnerId: string, organizations: Organization[]): MissionTransformResult | null => {
  if (!doc) {
    return null;
  }

  const organization = organizations.find((e) => e.old_id === doc.organizationId);

  const obj = {
    old_id: doc._id.toString(),
    title: doc.title,
    client_id: doc.clientId,
    description: doc.description,
    description_html: doc.descriptionHtml,
    tags: doc.tags,
    tasks: doc.tasks,
    domain: doc.domain,
    audience: doc.audience || [],
    soft_skills: doc.soft_skills || [],
    close_to_transport: doc.closeToTransport,
    reduced_mobility_accessible: doc.reducedMobilityAccessible,
    open_to_minors: doc.openToMinors,
    remote: doc.remote,
    schedule: doc.schedule,
    duration: doc.duration,
    posted_at: new Date(doc.postedAt),
    start_at: new Date(doc.startAt),
    end_at: doc.endAt ? new Date(doc.endAt) : null,
    priority: doc.priority,
    places: doc.places,
    metadata: doc.metadata,
    activity: doc.activity,
    type: doc.publisherId === SC_ID ? "volontariat" : "benevolat",
    snu: doc.snu,
    snu_places: doc.snuPlaces,

    address: doc.address ? doc.address.toString() : "",
    postal_code: doc.postalCode ? doc.postalCode.toString() : "",
    city: doc.city,
    department_name: doc.departmentName,
    department_code: doc.departmentCode ? doc.departmentCode.toString() : "",
    region: doc.region,
    country: doc.country,
    latitude: doc.location?.lat || null,
    longitude: doc.location?.lon || null,
    geoloc_status: doc.geolocStatus,
    organization_url: doc.organizationUrl,
    organization_name: doc.organizationName,
    organization_logo: doc.organizationLogo,
    organization_client_id: doc.organizationId,
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
    rna_status: doc.rnaStatus,

    matched_organization_id: organization?.id || null,
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
    last_sync_at: new Date(doc.lastSyncAt || doc.updatedAt),
    status: doc.statusCode,
    status_comment: doc.statusComment,

    jva_moderation_status: doc["moderation_5f5931496c7ea514150a818f_status"],
    jva_moderation_comment: doc["moderation_5f5931496c7ea514150a818f_comment"],
    jva_moderation_title: doc["moderation_5f5931496c7ea514150a818f_title"],
    jva_moderation_updated_at: doc["moderation_5f5931496c7ea514150a818f_date"] ? new Date(doc["moderation_5f5931496c7ea514150a818f_date"]) : undefined,

    leboncoin_moderation_status: doc.leboncoinStatus,
    leboncoin_moderation_comment: doc.leboncoinComment,
    leboncoin_moderation_url: doc.leboncoinUrl,
    leboncoin_moderation_updated_at: doc.leboncoinUpdatedAt ? new Date(doc.leboncoinUpdatedAt) : undefined,

    created_at: new Date(doc.createdAt),
    updated_at: new Date(doc.updatedAt),
    deleted_at: doc.deletedAt ? new Date(doc.deletedAt) : null,
  } as PgMission;

  // Transform addresses
  const addresses: PgAddress[] = doc.addresses.map(
    (address) =>
      ({
        old_id: address._id?.toString() || "",
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

  // Transform history entries
  const history: MissionHistoryEntry[] =
    doc.__history?.flatMap((history) =>
      getTypeFromMissionHistoryEvent(history).map((type) => ({
        date: history.date,
        mission_id: obj.id,
        type,
      }))
    ) || [];

  return { mission: obj, addresses, history };
};

/**
 * Analyze a mission history entry and determine which MissionHistoryEventTypes to assign
 *
 * @param missionHistory The mission history entry containing state and metadata
 * @returns An array of MissionHistoryEventTypes
 */
export const getTypeFromMissionHistoryEvent = (
  missionHistory: any // TODO
): MissionHistoryEventType[] => {
  const eventTypes: MissionHistoryEventType[] = [];
  const { state, metadata } = missionHistory;

  // For creation type, return only MissionCreated
  if (metadata && "action" in metadata && metadata.action === "created") {
    return [MissionHistoryEventType.Created];
  }

  if ("deletedAt" in state) {
    eventTypes.push(MissionHistoryEventType.Deleted);
  }

  if ("startAt" in state) {
    eventTypes.push(MissionHistoryEventType.UpdatedStartDate);
  }

  if ("endAt" in state) {
    eventTypes.push(MissionHistoryEventType.UpdatedEndDate);
  }

  if ("description" in state || "descriptionHtml" in state) {
    eventTypes.push(MissionHistoryEventType.UpdatedDescription);
  }

  if ("domain" in state) {
    eventTypes.push(MissionHistoryEventType.UpdatedActivityDomain);
  }

  if ("places" in state) {
    eventTypes.push(MissionHistoryEventType.UpdatedPlaces);
  }

  if (state.hasOwnProperty(`moderation_${JVA_ID}_status`)) {
    eventTypes.push(MissionHistoryEventType.UpdatedJVAModerationStatus);
  }

  if ("status" in state || "statusCode" in state) {
    eventTypes.push(MissionHistoryEventType.UpdatedApiEngModerationStatus);
  }

  if (eventTypes.length === 0) {
    eventTypes.push(MissionHistoryEventType.UpdatedOther);
  }

  return eventTypes;
};
