import { MissionHistoryEventType, Organization } from "@prisma/client";
import { Schema } from "mongoose";
import { describe, expect, it } from "vitest";
import { JVA_ID } from "../../../../config";
import { Mission as MongoMission } from "../../../../types";
import { getMissionHistoryEventTypeFromState, transformMongoMissionToPg } from "../transformers";

// TODO: is this interface defined in the project?
interface Address {
  _id?: Schema.Types.ObjectId;
  street: string;
  city: string;
  postalCode: string;
  departmentName: string;
  departmentCode: string;
  region: string;
  country: string;
  location: { lon: number; lat: number };
  geoPoint: { type: "Point"; coordinates: [number, number] } | null;
  geolocStatus:
    | "NOT_FOUND"
    | "FAILED"
    | "ENRICHED_BY_PUBLISHER"
    | "ENRICHED_BY_API"
    | "NO_DATA"
    | "SHOULD_ENRICH";
}

// Transform ID to fake Mongo ObjectId
const randomObjectId = (id: string) =>
  ({
    toString: () => id,
  }) as unknown as Schema.Types.ObjectId;

describe("transformMongoMissionToPg", () => {
  const baseOrganization: Organization = {
    id: "org-123",
    old_id: "mongo-org-123",
    rna: "RNA123",
    siren: "SIREN123",
    siret: "SIRET123",
    names: ["name1"],
    rup_mi: "RUP123",
    gestion: "GESTION",
    status: "ACTIVE",
    created_at: new Date("2023-01-01"),
    last_declared_at: new Date("2023-01-02"),
    published_at: new Date("2023-01-03"),
    dissolved_at: null,
    updated_at: new Date("2023-01-04"),
    nature: "NATURE",
    groupement: "GROUPEMENT",
    title: "Organisation Test",
    short_title: "Org Test",
    title_slug: "organisation-test",
    short_title_slug: "org-test",
    object: "OBJECT",
    social_object1: "SOCIAL1",
    social_object2: "SOCIAL2",
    address_complement: "COMPLEMENT",
    address_number: "123",
    address_repetition: "BIS",
    address_type: "RUE",
    address_street: "RUE TEST",
    address_distribution: "DISTRIBUTION",
    address_insee_code: "INSEE123",
    address_postal_code: "75000",
    address_department_code: "75",
    address_department_name: "Paris",
    address_region: "Île-de-France",
    address_city: "Paris",
    management_declarant: "DECLARANT",
    management_complement: "MGMT_COMPLEMENT",
    management_street: "MGMT_STREET",
    management_distribution: "MGMT_DISTRIBUTION",
    management_postal_code: "75000",
    management_city: "Paris",
    management_country: "France",
    director_civility: "M",
    website: "https://example.com",
    observation: "OBSERVATION",
    sync_at: new Date("2023-01-05"),
    source: "SOURCE",
  };

  const baseAddress: Address = {
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
    soft_skills: ["Communication", "Travail en équipe"],
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
        },
      },
    ],
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-10"),
    deletedAt: null,
    deleted: false,
  };

  it("should return null if mission is null", () => {
    const result = transformMongoMissionToPg(null as unknown as MongoMission, "123", []);
    expect(result).toBeNull();
  });

  it("should transform a MongoDB mission to PostgreSQL format", () => {
    const organizations: Organization[] = [baseOrganization];
    const mongoMission: MongoMission = {
      ...baseMongoMission,
    } as MongoMission;

    const result = transformMongoMissionToPg(mongoMission, "partner-123", organizations);

    expect(result).not.toBeNull();
    expect(result?.mission).toBeDefined();
    expect(result?.addresses).toBeDefined();
    expect(result?.history).toBeDefined();

    expect(result?.mission.old_id).toBe("mission-123");
    expect(result?.mission.title).toBe("Mission Test");
    expect(result?.mission.client_id).toBe("client-123");
    expect(result?.mission.type).toBe("volontariat"); // Car publisherId est 5f99dbe75eb1ad767733b206
    expect(result?.mission.organization_name).toBe("Organisation Test");
    expect(result?.mission.organization_client_id).toBe("mongo-org-123");
    expect(result?.mission.matched_organization_id).toBe("org-123");
    expect(result?.mission.is_rna_verified).toBe(true);
    expect(result?.mission.is_siren_verified).toBe(true);
    expect(result?.mission.is_siret_verified).toBe(true);
    expect(result?.mission.partner_id).toBe("partner-123");

    expect(result?.addresses.length).toBe(1);
    expect(result?.addresses[0].old_id).toBe("address-123");
    expect(result?.addresses[0].street).toBe("123 RUE TEST");
    expect(result?.addresses[0].city).toBe("Paris");
    expect(result?.addresses[0].latitude).toBe(48.8566);
    expect(result?.addresses[0].longitude).toBe(2.3522);

    expect(result?.history.length).toBe(1);
    expect(result?.history[0].date).toEqual(new Date("2023-01-20"));
    expect(result?.history[0].type).toBeDefined(); // Value will be checked by getMissionHistoryEventTypeFromState test
  });

  it("should handle a mission with no organization match", () => {
    const mongoMission: MongoMission = {
      ...baseMongoMission,
      publisherId: "publisher-456", // For "benevolat" testing
      organizationId: "org-inexistante",
      organizationName: "Organisation Inexistante",
    } as MongoMission;

    const result = transformMongoMissionToPg(mongoMission, "partner-456", []);

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

    const result = transformMongoMissionToPg(mongoMission, "partner-789", []);

    expect(result).not.toBeNull();
    expect(result?.mission).toBeDefined();
    expect(result?.addresses).toEqual([]);
  });

  it("should handle a mission with no history", () => {
    const mongoMission: MongoMission = {
      ...baseMongoMission,
      __history: undefined,
    } as MongoMission;

    const result = transformMongoMissionToPg(mongoMission, "partner-101", []);

    expect(result).not.toBeNull();
    expect(result?.mission).toBeDefined();
    expect(result?.history).toEqual([]);
  });
});

describe("getMissionHistoryEventTypeFromState", () => {
  it("should return MissionsDeleted event type", () => {
    const result = getMissionHistoryEventTypeFromState({
      deletedAt: "2023-01-01",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result).toContain(MissionHistoryEventType.MissionDeleted);
  });

  it("should return MissionsModifiedStartDate event type", () => {
    const result = getMissionHistoryEventTypeFromState({
      startAt: "2023-01-01",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedStartDate);
  });

  it("should return MissionsModifiedEndDate event type", () => {
    const result = getMissionHistoryEventTypeFromState({
      endAt: "2023-01-01",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedEndDate);
  });

  it("should return MissionModifiedDescription event type", () => {
    const result = getMissionHistoryEventTypeFromState({
      description: "Description",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedDescription);
  });

  it("should return MissionModifiedActivityDomain event type", () => {
    const result = getMissionHistoryEventTypeFromState({
      domain: "Domaine",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedActivityDomain);
  });

  it("should return MissionModifiedPlaces event type", () => {
    const result = getMissionHistoryEventTypeFromState({
      places: 1,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedPlaces);
  });

  it("should return MissionModifiedJVAModerationStatus event type", () => {
    const result = getMissionHistoryEventTypeFromState({
      [`moderation_${JVA_ID}_status`]: "status",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedJVAModerationStatus);
  });

  it("should return MissionModifiedApiEngModerationStatus event type", () => {
    const result = getMissionHistoryEventTypeFromState({
      //jva_moderation_status: 'status',
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedApiEngModerationStatus);
  });

  it("should return MissionModifiedOther event type", () => {
    const result = getMissionHistoryEventTypeFromState({
      other: "value",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedOther);
  });

  it("Should return multiple event types", () => {
    const result = getMissionHistoryEventTypeFromState({
      startAt: "2023-01-01",
      endAt: "2023-01-02",
      description: "Description",
      domain: "Domaine",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(4);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedStartDate);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedEndDate);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedDescription);
    expect(result).toContain(MissionHistoryEventType.MissionModifiedActivityDomain);
  });
});
