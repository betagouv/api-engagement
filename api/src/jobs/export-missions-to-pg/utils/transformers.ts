import { PUBLISHER_IDS } from "../../../config";
import { MissionHistoryEvent, MissionHistoryEventType, MissionType, Address as PgAddress, Mission as PgMission, Prisma } from "../../../db/analytics";
import { Mission as MongoMission, MissionEvent as MongoMissionEvent } from "../../../types";
import { MissionTransformResult } from "../types";

/**
 * Transform a MongoDB mission into PostgreSQL format
 *
 * @param doc The MongoDB mission to transform
 * @param partnerId The partner ID
 * @param organizationId The organization ID
 * @returns The transformed mission with addresses and history
 */
export const transformMongoMissionToPg = (doc: MongoMission | null, partnerId: string, organizationId?: string): MissionTransformResult | null => {
  if (!doc) {
    return null;
  }

  const obj = {
    old_id: doc._id?.toString() || "",
    title: doc.title,
    client_id: doc.clientId,
    description: doc.description,
    description_html: doc.descriptionHtml,
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
    posted_at: new Date(doc.postedAt),
    start_at: new Date(doc.startAt),
    end_at: doc.endAt ? new Date(doc.endAt) : null,
    priority: doc.priority,
    places: doc.places,
    metadata: doc.metadata,
    activity: doc.activity,
    type: getMissionType(doc.type),
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
    last_sync_at: new Date(doc.lastSyncAt || doc.updatedAt),
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

    created_at: new Date(doc.createdAt),
    updated_at: new Date(doc.updatedAt),
    deleted_at: doc.deletedAt ? new Date(doc.deletedAt) : null,
  } as PgMission;

  // Transform addresses
  const addresses: PgAddress[] = doc.addresses?.map(
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

  return { mission: obj, addresses };
};

const getMissionType = (type: string) => {
  if (type === "benevolat") {
    return MissionType.benevolat;
  }
  return MissionType.volontariat_service_civique;
};

const MONGO_TO_PG_FIELDS = {
  activity: "activity",
  applicationUrl: "application_url",
  audience: "audience",
  clientId: "client_id",
  closeToTransport: "close_to_transport",
  deletedAt: "deleted_at",
  description: "description",
  descriptionHtml: "description_html",
  domain: "domain",
  domainLogo: "domain_logo",
  duration: "duration",
  endAt: "end_at",
  metadata: "metadata",
  openToMinors: "open_to_minors",
  organizationName: "organization_name",
  organizationRNA: "organization_rna",
  organizationSiren: "organization_siren",
  organizationUrl: "organization_url",
  organizationLogo: "organization_logo",
  organizationDescription: "organization_description",
  organizationClientId: "organization_client_id",
  organizationStatusJuridique: "organization_status_juridique",
  organizationType: "organization_type",
  organizationActions: "organization_actions",
  organizationFullAddress: "organization_full_address",
  organizationPostCode: "organization_post_code",
  organizationCity: "organization_city",
  organizationBeneficiaries: "organization_beneficiaries",
  organizationReseaux: "organization_reseaux",
  organizationVerificationStatus: "organization_verification_status",
  places: "places",
  postedAt: "posted_at",
  priority: "priority",
  reducedMobilityAccessible: "reduced_mobility_accessible",
  remote: "remote",
  requirements: "requirements",
  romeSkills: "rome_skills",
  schedule: "schedule",
  snu: "snu",
  snuPlaces: "snu_places",
  softSkills: "soft_skills",
  startAt: "start_at",
  statusCode: "status",
  statusComment: "status_comment",
  tags: "tags",
  title: "title",
  type: "type",
};

/**
 * Transform a MongoDB mission into PostgreSQL format
 *
 * @param doc The MongoDB mission to transform
 * @param partnerId The partner ID
 * @param organizationId The organization ID
 * @returns The transformed mission with addresses and history
 */
export const transformMongoMissionEventToPg = (doc: MongoMissionEvent, missionId: string): MissionHistoryEvent[] | null => {
  if (!doc || !missionId) {
    return null;
  }

  const baseEvent = {
    mission_id: missionId,
    date: doc.createdAt,
    changes: null,
  } as MissionHistoryEvent;

  const events: MissionHistoryEvent[] = [];

  // For creation type, return only MissionCreated
  if (doc.type === "create") {
    return [
      {
        ...baseEvent,
        type: MissionHistoryEventType.Created,
      },
    ];
  }

  if (doc.type === "delete") {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.Deleted,
      changes: {
        deleted_at: {
          previous: doc.changes?.deletedAt.previous,
          current: doc.changes?.deletedAt.current,
        },
      } as Prisma.JsonValue,
    });
  }

  if (!doc.changes) {
    return events;
  }

  if (doc.changes.startAt) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedStartDate,
      changes: {
        start_at: {
          previous: doc.changes.startAt.previous,
          current: doc.changes.startAt.current,
        },
      } as Prisma.JsonValue,
    });
  }

  if (doc.changes.endAt) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedEndDate,
      changes: {
        end_at: {
          previous: doc.changes.endAt.previous,
          current: doc.changes.endAt.current,
        },
      } as Prisma.JsonValue,
    });
  }

  if (doc.changes.description) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedDescription,
      changes: {
        description: {
          previous: doc.changes.description.previous,
          current: doc.changes.description.current,
        },
      },
    });
  }
  if (doc.changes.descriptionHtml) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedDescription,
      changes: {
        description_html: {
          previous: doc.changes.descriptionHtml.previous,
          current: doc.changes.descriptionHtml.current,
        },
      } as Prisma.JsonValue,
    });
  }

  if (doc.changes.domain) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedActivityDomain,
      changes: {
        domain: {
          previous: doc.changes.domain.previous,
          current: doc.changes.domain.current,
        },
      },
    });
  }

  if (doc.changes.places) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedPlaces,
      changes: {
        places: {
          previous: doc.changes.places.previous,
          current: doc.changes.places.current,
        },
      } as Prisma.JsonValue,
    });
  }

  if (doc.changes[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`]) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedJVAModerationStatus,
      changes: {
        jva_moderation_status: {
          previous: doc.changes[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`]?.previous || null,
          current: doc.changes[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`].current,
        },
      } as Prisma.JsonValue,
    });
  }

  if (doc.changes.statusCode) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedApiEngModerationStatus,
      changes: {
        status: {
          previous: doc.changes.statusCode.previous,
          current: doc.changes.statusCode.current,
        },
      } as Prisma.JsonValue,
    });
  }

  if (events.length === 0 && doc.changes) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedOther,
      changes: Object.keys(doc.changes).reduce(
        (acc, key) => {
          if (!doc.changes || !doc.changes[key]) {
            return acc;
          }
          acc[MONGO_TO_PG_FIELDS[key as keyof typeof MONGO_TO_PG_FIELDS]] = {
            previous: doc.changes[key]?.previous || null,
            current: doc.changes[key].current,
          };
          return acc;
        },
        {} as Record<string, { previous: any; current: any }>
      ) as Prisma.JsonValue,
    });
  }

  return events;
};
