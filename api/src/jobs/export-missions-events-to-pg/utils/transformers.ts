import { MissionHistoryEvent, MissionHistoryEventType, Prisma } from "@prisma/client";
import { PUBLISHER_IDS } from "../../../config";
import { MissionEvent as MongoMissionEvent } from "../../../types";

const MONGO_TO_PG_FIELDS = {
  title: "title",
  type: "type",
  description: "description",
  descriptionHtml: "description_html",
  clientId: "client_id",
  applicationUrl: "application_url",
  postedAt: "posted_at",
  startAt: "start_at",
  endAt: "end_at",
  duration: "duration",
  activity: "activity",
  domain: "domain",
  domainLogo: "domain_logo",
  schedule: "schedule",
  audience: "audience",
  softSkills: "soft_skills",
  romeSkills: "rome_skills",
  requirements: "requirements",
  remote: "remote",
  reducedMobilityAccessible: "reduced_mobility_accessible",
  closeToTransport: "close_to_transport",
  openToMinors: "open_to_minors",
  priority: "priority",
  tags: "tags",
  places: "places",
  snu: "snu",
  snuPlaces: "snu_places",
  metadata: "metadata",
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
  statusComment: "status_comment",
  statusCode: "status",
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
      fields: ["deleted_at"],
      changes: {
        deleted_at: {
          previous: doc.changes?.deletedAt.previous || null,
          current: doc.changes?.deletedAt.current || null,
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
      fields: ["start_at"],
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
      fields: ["end_at"],
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
      fields: ["description"],
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
      fields: ["description_html"],
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
      fields: ["domain"],
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
      fields: ["places"],
      changes: {
        places: {
          previous: doc.changes.places.previous,
          current: doc.changes.places.current,
        },
      } as Prisma.JsonValue,
    });
  }

  // eslint-disable-next-line no-prototype-builtins
  if (doc.changes[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`]) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedJVAModerationStatus,
      fields: ["jva_moderation_status"],
      changes: {
        jva_moderation_status: {
          previous: doc.changes[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`].previous,
          current: doc.changes[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`].current,
        },
      } as Prisma.JsonValue,
    });
  }

  if (doc.changes.statusCode) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedApiEngModerationStatus,
      fields: ["status"],
      changes: {
        status: {
          previous: doc.changes.status.previous,
          current: doc.changes.status.current,
        },
      } as Prisma.JsonValue,
    });
  }

  if (events.length === 0 && doc.changes) {
    events.push({
      ...baseEvent,
      type: MissionHistoryEventType.UpdatedOther,
      fields: Object.keys(doc.changes).map((key) => MONGO_TO_PG_FIELDS[key as keyof typeof MONGO_TO_PG_FIELDS]),
      changes: Object.keys(doc.changes).reduce(
        (acc, key) => {
          if (!doc.changes || !doc.changes[key]) {
            return acc;
          }
          acc[MONGO_TO_PG_FIELDS[key as keyof typeof MONGO_TO_PG_FIELDS]] = {
            previous: doc.changes[key].previous,
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
