import { Schema } from "mongoose";
import { describe, expect, it } from "vitest";
import { PUBLISHER_IDS } from "../../../../config";
import { MissionHistoryEventType } from "../../../../db/analytics";
import { AddressItem, Mission as MongoMission, MissionEvent as MongoMissionEvent } from "../../../../types";
import { EVENT_TYPES } from "../../../../utils/mission";
import { transformMongoMissionEventToPg, transformMongoMissionToPg } from "../transformers";

// Transform ID to fake Mongo ObjectId
const randomObjectId = (id: string) =>
  ({
    toString: () => id,
  }) as unknown as Schema.Types.ObjectId;

describe("transformMongoMissionToPg", () => {
  const baseAddress: AddressItem = {
    _id: randomObjectId("address-123"),
    street: "123 RUE TEST",
    city: "Paris",
    postalCode: "75000",
    departmentName: "Paris",
    departmentCode: "75",
    region: "Île-de-France",
    country: "France",
    location: { lat: 48.8566, lon: 2.3522 },
    geoPoint: { type: "Point", coordinates: [2.3522, 48.8566] },
    geolocStatus: "ENRICHED_BY_API",
  };

  const baseHistoryState = {
    title: "Ancien titre",
    postedAt: "2023-01-10",
    updatedAt: "2023-01-10",
  };

  const baseMongoMission: Partial<MongoMission> = {
    _id: randomObjectId("mission-123"),
    publisherId: "5f99dbe75eb1ad767733b206", // For testing "volontariat" type
    publisherName: "Publisher Test",
    publisherUrl: "https://publisher.test",
    publisherLogo: "logo.png",
    lastSyncAt: new Date("2023-01-10"),
    applicationUrl: "https://apply.test",
    statusCode: "ACTIVE",
    statusComment: "Mission active",
    clientId: "client-123",
    title: "Mission Test",
    description: "Description de la mission",
    descriptionHtml: "<p>Description de la mission</p>",
    tags: ["tag1", "tag2"],
    tasks: ["task1", "task2"],
    domain: "Domaine Test",
    audience: ["Tous publics"],
    softSkills: ["Communication", "Travail en équipe"],
    romeSkills: ["123456"],
    requirements: ["Pré-requis 1", "Pré-requis 2"],
    compensationAmount: 10,
    compensationUnit: "hour",
    compensationType: "gross",
    organizationId: "mongo-org-123",
    organizationUrl: "https://org.test",
    organizationName: "Organisation Test",
    organizationLogo: "org-logo.png",
    organizationDescription: "Description de l'organisation",
    organizationRNA: "RNA123",
    organizationSiren: "SIREN123",
    organizationFullAddress: "123 RUE TEST, 75000 Paris",
    organizationCity: "Paris",
    organizationDepartment: "Paris",
    organizationPostCode: "75000",
    organizationStatusJuridique: "Association",
    organizationBeneficiaries: ["Jeunes", "Seniors"],
    organizationReseaux: ["Réseau1", "Réseau2"],
    organizationActions: ["Action1", "Action2"],
    organizationNameVerified: "Organisation Test Vérifiée",
    organizationRNAVerified: "RNA123V",
    organizationSirenVerified: "SIREN123V",
    organizationSiretVerified: "SIRET123V",
    organizationAddressVerified: "123 RUE TEST VERIFIEE",
    organizationCityVerified: "Paris Vérifié",
    organizationPostalCodeVerified: "75000V",
    organizationDepartmentCodeVerified: "75V",
    organizationDepartmentNameVerified: "Paris Vérifié",
    organizationRegionVerified: "Île-de-France Vérifiée",
    organisationIsRUP: true,
    organizationVerificationStatus: "VERIFIED",
    rnaStatus: "ENRICHED",
    closeToTransport: "yes",
    reducedMobilityAccessible: "yes",
    openToMinors: "no",
    schedule: "Lundi au vendredi, 9h-17h",
    type: "benevolat",
    postedAt: new Date("2023-01-15"),
    startAt: new Date("2023-02-01"),
    endAt: new Date("2023-03-01"),
    priority: "HIGH",
    places: 5,
    metadata: '{"key":"value"}',
    activity: "Activité Test",
    snu: true,
    snuPlaces: 2,
    remote: "possible",
    address: "123 RUE TEST",
    postalCode: "75000",
    city: "Paris",
    departmentName: "Paris",
    departmentCode: "75",
    region: "Île-de-France",
    country: "France",
    geolocStatus: "ENRICHED_BY_API",
    location: { lat: 48.8566, lon: 2.3522 },
    addresses: [baseAddress],
    __history: [
      {
        date: new Date("2023-01-20"),
        state: baseHistoryState,
        metadata: {
          reason: "reason",
          action: "created",
        },
      },
    ],
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-10"),
    deletedAt: null,
    deleted: false,
  };

  it("should return null if mission is null", () => {
    const result = transformMongoMissionToPg(null as unknown as MongoMission, "123", "org-123");
    expect(result).toBeNull();
  });

  it("should transform a MongoDB mission to PostgreSQL format", () => {
    const mongoMission: MongoMission = {
      ...baseMongoMission,
    } as MongoMission;

    const result = transformMongoMissionToPg(mongoMission, "partner-123", "org-123");

    expect(result).not.toBeNull();
    expect(result?.mission).toBeDefined();
    expect(result?.addresses).toBeDefined();

    expect(result?.mission.old_id).toBe("mission-123");
    expect(result?.mission.title).toBe("Mission Test");
    expect(result?.mission.client_id).toBe("client-123");
    expect(result?.mission.type).toBe("benevolat");
    expect(result?.mission.soft_skills).toEqual(["Communication", "Travail en équipe"]);
    expect(result?.mission.rome_skills).toEqual(["123456"]);
    expect(result?.mission.requirements).toEqual(["Pré-requis 1", "Pré-requis 2"]);
    expect(result?.mission.organization_name).toBe("Organisation Test");
    expect(result?.mission.organization_client_id).toBe("mongo-org-123");
    expect(result?.mission.matched_organization_id).toBe("org-123");
    expect(result?.mission.is_rna_verified).toBe(true);
    expect(result?.mission.is_siren_verified).toBe(true);
    expect(result?.mission.is_siret_verified).toBe(true);
    expect(result?.mission.partner_id).toBe("partner-123");
    expect(result?.mission.compensation_amount).toBe(10);
    expect(result?.mission.compensation_unit).toBe("hour");
    expect(result?.mission.compensation_type).toBe("gross");

    expect(result?.addresses.length).toBe(1);
    expect(result?.addresses[0].old_id).toBe("address-123");
    expect(result?.addresses[0].street).toBe("123 RUE TEST");
    expect(result?.addresses[0].city).toBe("Paris");
    expect(result?.addresses[0].latitude).toBe(48.8566);
    expect(result?.addresses[0].longitude).toBe(2.3522);
  });

  it("should handle a mission with no organization match", () => {
    const mongoMission: MongoMission = {
      ...baseMongoMission,
      publisherId: "publisher-456", // For "benevolat" testing
      organizationId: "org-inexistante",
      organizationName: "Organisation Inexistante",
    } as MongoMission;

    const result = transformMongoMissionToPg(mongoMission, "partner-456", undefined);

    expect(result).not.toBeNull();
    expect(result?.mission).toBeDefined();
    expect(result?.mission.matched_organization_id).toBeNull();
    expect(result?.mission.type).toBe("benevolat");
  });

  it("should handle a mission with empty addresses", () => {
    const mongoMission: MongoMission = {
      ...baseMongoMission,
      addresses: [],
    } as MongoMission;

    const result = transformMongoMissionToPg(mongoMission, "partner-789", "org-789");

    expect(result).not.toBeNull();
    expect(result?.mission).toBeDefined();
    expect(result?.addresses).toEqual([]);
  });

  it("should handle a mission with no history", () => {
    const mongoMission: MongoMission = {
      ...baseMongoMission,
      __history: undefined,
    } as MongoMission;

    const result = transformMongoMissionToPg(mongoMission, "partner-101", "org-101");

    expect(result).not.toBeNull();
    expect(result?.mission).toBeDefined();
  });
});

describe("transformMongoMissionEventToPg", () => {
  const baseMissionEvent: MongoMissionEvent = {
    _id: randomObjectId("event-123"),
    type: EVENT_TYPES.CREATE,
    missionId: randomObjectId("mission-123"),
    changes: null,
    createdAt: new Date("2023-01-15"),
    lastExportedToPgAt: null,
  };

  it("should return null if missionEvent is null", () => {
    const result = transformMongoMissionEventToPg(null as unknown as MongoMissionEvent, "mission-123");
    expect(result).toBeNull();
  });

  it("should return null if missionId is null", () => {
    const result = transformMongoMissionEventToPg(baseMissionEvent, "");
    expect(result).toBeNull();
  });

  it("should transform a create event", () => {
    const createEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "create",
    };

    const result = transformMongoMissionEventToPg(createEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.Created);
    expect(result?.[0].mission_id).toBe("mission-123");
    expect(result?.[0].date).toEqual(new Date("2023-01-15"));
    expect(result?.[0].changes).toBeNull();
  });

  it("should transform a delete event", () => {
    const deleteEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.DELETE,
      changes: {
        deletedAt: {
          previous: null,
          current: new Date("2023-01-15"),
        },
      },
    };

    const result = transformMongoMissionEventToPg(deleteEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.Deleted);
    expect(result?.[0].mission_id).toBe("mission-123");
    expect(result?.[0].date).toEqual(new Date("2023-01-15"));
    expect(result?.[0].changes).toEqual({
      deleted_at: {
        previous: null,
        current: new Date("2023-01-15"),
      },
    });
  });

  it("should transform an update event with startAt change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        startAt: {
          previous: new Date("2023-01-01"),
          current: new Date("2023-02-01"),
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedStartDate);
    expect(result?.[0].changes).toEqual({
      start_at: {
        previous: new Date("2023-01-01"),
        current: new Date("2023-02-01"),
      },
    });
  });

  it("should transform an update event with endAt change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        endAt: {
          previous: new Date("2023-03-01"),
          current: new Date("2023-04-01"),
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedEndDate);
    expect(result?.[0].changes).toEqual({
      end_at: {
        previous: new Date("2023-03-01"),
        current: new Date("2023-04-01"),
      },
    });
  });

  it("should transform an update event with description change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        description: {
          previous: "Old description",
          current: "New description",
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedDescription);
    expect(result?.[0].changes).toEqual({
      description: {
        previous: "Old description",
        current: "New description",
      },
    });
  });

  it("should transform an update event with descriptionHtml change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        descriptionHtml: {
          previous: "<p>Old description</p>",
          current: "<p>New description</p>",
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedDescription);
    expect(result?.[0].changes).toEqual({
      description_html: {
        previous: "<p>Old description</p>",
        current: "<p>New description</p>",
      },
    });
  });

  it("should transform an update event with domain change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        domain: {
          previous: "Old domain",
          current: "New domain",
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedActivityDomain);
    expect(result?.[0].changes).toEqual({
      domain: {
        previous: "Old domain",
        current: "New domain",
      },
    });
  });

  it("should transform an update event with places change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        places: {
          previous: 5,
          current: 10,
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedPlaces);
    expect(result?.[0].changes).toEqual({
      places: {
        previous: 5,
        current: 10,
      },
    });
  });

  it("should transform an update event with JVA moderation status change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        [`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`]: {
          previous: "PENDING",
          current: "ACCEPTED",
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedJVAModerationStatus);
    expect(result?.[0].changes).toEqual({
      jva_moderation_status: {
        previous: "PENDING",
        current: "ACCEPTED",
      },
    });
  });

  it("should transform an update event with status change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        statusCode: {
          previous: "PENDING",
          current: "ACCEPTED",
        },
        status: {
          previous: "PENDING",
          current: "ACCEPTED",
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedApiEngModerationStatus);
    expect(result?.[0].changes).toEqual({
      status: {
        previous: "PENDING",
        current: "ACCEPTED",
      },
    });
  });

  it("should transform an update event with multiple changes", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        startAt: {
          previous: new Date("2023-01-01"),
          current: new Date("2023-02-01"),
        },
        description: {
          previous: "Old description",
          current: "New description",
        },
        places: {
          previous: 5,
          current: 10,
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(3);
    expect(result?.map((e) => e.type)).toContain(MissionHistoryEventType.UpdatedStartDate);
    expect(result?.map((e) => e.type)).toContain(MissionHistoryEventType.UpdatedDescription);
    expect(result?.map((e) => e.type)).toContain(MissionHistoryEventType.UpdatedPlaces);
  });

  it("should transform an update event with other changes", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: {
        title: {
          previous: "Old title",
          current: "New title",
        },
        activity: {
          previous: "Old activity",
          current: "New activity",
        },
      },
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedOther);
    expect(result?.[0].changes).toEqual({
      title: {
        previous: "Old title",
        current: "New title",
      },
      activity: {
        previous: "Old activity",
        current: "New activity",
      },
    });
  });

  it("should return empty array for update event with no changes", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: EVENT_TYPES.UPDATE,
      changes: null,
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).toEqual([]);
  });
});
