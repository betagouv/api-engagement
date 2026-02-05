import { describe, expect, it, vi } from "vitest";
import type { PublisherRecord } from "../../../../types/publisher";
import type { MissionXML } from "../../types";
import { parseOrganization } from "../organization";

vi.mock("../../../error", () => ({
  captureException: vi.fn(),
}));

const createPublisher = (overrides: Partial<PublisherRecord> = {}): PublisherRecord => ({
  _id: "publisher-id",
  id: "publisher-id",
  name: "Test Publisher",
  category: null,
  url: null,
  moderator: false,
  moderatorLink: null,
  email: null,
  documentation: null,
  logo: null,
  defaultMissionLogo: "https://default-logo.com/logo.png",
  lead: null,
  feed: null,
  feedUsername: null,
  feedPassword: null,
  apikey: null,
  description: "",
  missionType: null,
  isAnnonceur: true,
  hasApiRights: false,
  hasWidgetRights: false,
  hasCampaignRights: false,
  sendReport: false,
  sendReportTo: [],
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  publishers: [],
  ...overrides,
});

const createMissionXML = (overrides: Partial<MissionXML> = {}): MissionXML =>
  ({
    id: "mission-1",
    title: "Test Mission",
    description: "Description",
    image: "",
    clientId: "client-1",
    applicationUrl: "https://example.com",
    postedAt: "2024-01-01",
    startAt: "2024-01-15",
    endAt: "2024-12-31",
    country: "France",
    countryCode: "FR",
    address: "123 Main St",
    adresse: "",
    city: "Paris",
    postalCode: "75001",
    departmentCode: "75",
    departmentName: "Paris",
    region: "Île-de-France",
    lonlat: undefined,
    lonLat: undefined,
    location: undefined,
    addresses: [],
    activity: "Social",
    tags: "",
    domain: "Solidarité",
    schedule: "Flexible",
    audience: "",
    soft_skills: "",
    softSkills: "",
    romeSkills: "",
    requirements: "",
    remote: "no",
    reducedMobilityAccessible: "no",
    closeToTransport: "no",
    openToMinors: "no",
    priority: "normal",
    metadata: "",
    places: 5,
    organizationName: "Test Organization",
    organizationRNA: "",
    organizationRna: "",
    organizationSiren: "",
    organizationUrl: "https://org.example.com",
    organizationLogo: "https://org.example.com/logo.png",
    organizationDescription: "Organization description",
    organizationClientId: "org-client-1",
    organizationStatusJuridique: "Association",
    organizationType: "Association loi 1901",
    organizationActions: [],
    organizationId: "org-1",
    organizationFullAddress: "123 Rue de Paris, 75001 Paris",
    organizationPostCode: "75001",
    organizationCity: "Paris",
    organizationBeneficiaires: "",
    organizationBeneficiaries: "",
    organizationReseaux: "",
    publicsBeneficiaires: "",
    publicBeneficiaries: "",
    snu: "no",
    snuPlaces: undefined,
    keyActions: undefined,
    isAutonomy: undefined,
    autonomyZips: undefined,
    parentOrganizationName: "",
    ...overrides,
  }) as MissionXML;

describe("parseOrganization", () => {
  describe("basic parsing", () => {
    it("should parse organization with all basic fields", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationName: "Mon Association",
        organizationDescription: "Description de l'association",
        organizationUrl: "https://mon-asso.fr",
        organizationLogo: "https://mon-asso.fr/logo.png",
        organizationStatusJuridique: "Association",
        organizationType: "Association loi 1901",
        organizationFullAddress: "10 Rue de la Paix",
        organizationPostCode: "75002",
        organizationCity: "Paris",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result).not.toBeNull();
      expect(result?.publisherId).toBe("publisher-id");
      expect(result?.name).toBe("Mon Association");
      expect(result?.description).toBe("Description de l'association");
      expect(result?.url).toBe("https://mon-asso.fr");
      expect(result?.logo).toBe("https://mon-asso.fr/logo.png");
      expect(result?.legalStatus).toBe("Association");
      expect(result?.type).toBe("Association loi 1901");
      expect(result?.fullAddress).toBe("10 Rue de la Paix");
      expect(result?.postalCode).toBe("75002");
      expect(result?.city).toBe("Paris");
    });

    it("should use publisher default logo when organization logo is not provided", () => {
      const publisher = createPublisher({ defaultMissionLogo: "https://default.com/logo.png" });
      const missionXML = createMissionXML({ organizationLogo: "" });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.logo).toBe("https://default.com/logo.png");
    });

    it("should use organization logo over publisher default when provided", () => {
      const publisher = createPublisher({ defaultMissionLogo: "https://default.com/logo.png" });
      const missionXML = createMissionXML({ organizationLogo: "https://org.com/logo.png" });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.logo).toBe("https://org.com/logo.png");
    });
  });

  describe("organizationClientId parsing", () => {
    it("should prefer organizationClientId over organizationId", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationClientId: "client-org-id",
        organizationId: "fallback-org-id",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.organizationClientId).toBe("client-org-id");
    });

    it("should fallback to organizationId when organizationClientId is empty", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "fallback-org-id",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.organizationClientId).toBe("fallback-org-id");
    });
  });

  describe("RNA parsing", () => {
    it("should normalize RNA from organizationRNA", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationRNA: "w123456789",
        organizationRna: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.rna).toBe("W123456789");
    });

    it("should fallback to organizationRna when organizationRNA is empty", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationRNA: "",
        organizationRna: "w987654321",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.rna).toBe("W987654321");
    });

    it("should remove special characters from RNA", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationRNA: "W-123-456-789",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.rna).toBe("W123456789");
    });

    it("should uppercase RNA", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationRNA: "w123abc456",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.rna).toBe("W123ABC456");
    });
  });

  describe("SIREN/SIRET parsing", () => {
    it("should parse valid SIRET and extract SIREN", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationSiren: "12345678901234",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.siret).toBe("12345678901234");
      expect(result?.siren).toBe("123456789");
    });

    it("should parse valid SIREN without SIRET", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationSiren: "123456789",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.siren).toBe("123456789");
      expect(result?.siret).toBeNull();
    });

    it("should return null for invalid SIREN/SIRET", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationSiren: "invalid",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.siren).toBeNull();
      expect(result?.siret).toBeNull();
    });

    it("should return null for empty SIREN", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationSiren: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.siren).toBeNull();
      expect(result?.siret).toBeNull();
    });

    it("should return null for SIREN with non-numeric characters", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationSiren: "12345678A",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.siren).toBeNull();
      expect(result?.siret).toBeNull();
    });
  });

  describe("beneficiaries parsing", () => {
    it("should parse beneficiaries from organizationBeneficiaries as comma-separated string", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationBeneficiaries: "Jeunes, Seniors, Familles",
        organizationBeneficiaires: "",
        publicBeneficiaries: "",
        publicsBeneficiaires: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.beneficiaries).toEqual(["Jeunes", "Seniors", "Familles"]);
    });

    it("should fallback to organizationBeneficiaires", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationBeneficiaries: "",
        organizationBeneficiaires: "Personnes âgées, Enfants",
        publicBeneficiaries: "",
        publicsBeneficiaires: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.beneficiaries).toEqual(["Personnes âgées", "Enfants"]);
    });

    it("should fallback to publicBeneficiaries", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationBeneficiaries: "",
        organizationBeneficiaires: "",
        publicBeneficiaries: "Étudiants, Demandeurs d'emploi",
        publicsBeneficiaires: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.beneficiaries).toEqual(["Étudiants", "Demandeurs d'emploi"]);
    });

    it("should fallback to publicsBeneficiaires", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationBeneficiaries: "",
        organizationBeneficiaires: "",
        publicBeneficiaries: "",
        publicsBeneficiaires: "Sans-abri",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.beneficiaries).toEqual(["Sans-abri"]);
    });

    it("should return empty array when no beneficiaries", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationBeneficiaries: "",
        organizationBeneficiaires: "",
        publicBeneficiaries: "",
        publicsBeneficiaires: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.beneficiaries).toEqual([]);
    });

    it("should parse beneficiaries from object with value array", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationBeneficiaries: { value: ["Jeunes", "Seniors"] } as unknown as string,
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.beneficiaries).toEqual(["Jeunes", "Seniors"]);
    });
  });

  describe("parentOrganizations parsing", () => {
    it("should parse organizationReseaux as comma-separated string", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationReseaux: "Réseau 1, Réseau 2",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.parentOrganizations).toEqual(["Réseau 1", "Réseau 2"]);
    });

    it("should parse organizationReseaux from object with value array", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationReseaux: { value: ["Réseau A", "Réseau B"] },
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.parentOrganizations).toEqual(["Réseau A", "Réseau B"]);
    });

    it("should return empty array when no reseaux", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationReseaux: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.parentOrganizations).toEqual([]);
    });
  });

  describe("actions parsing", () => {
    it("should parse keyActions as comma-separated string", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        keyActions: "Action 1, Action 2, Action 3",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.actions).toEqual(["Action 1", "Action 2", "Action 3"]);
    });

    it("should return empty array when no keyActions", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        keyActions: undefined,
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.actions).toEqual([]);
    });
  });

  describe("verified fields", () => {
    it("should set all verified fields to null", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML();

      const result = parseOrganization(publisher, missionXML);

      expect(result?.rnaVerified).toBeNull();
      expect(result?.sirenVerified).toBeNull();
      expect(result?.siretVerified).toBeNull();
      expect(result?.verifiedAt).toBeNull();
      expect(result?.organizationIdVerified).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle undefined values gracefully", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationName: undefined as unknown as string,
        organizationDescription: undefined as unknown as string,
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.name).toBe("");
      expect(result?.description).toBe("");
    });

    it("should trim whitespace from array values", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationBeneficiaries: "  Jeunes  ,  Seniors  ",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.beneficiaries).toEqual(["Jeunes", "Seniors"]);
    });

    it("should filter empty values from arrays", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationBeneficiaries: "Jeunes, , Seniors, ",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.beneficiaries).toEqual(["Jeunes", "Seniors"]);
    });

    it("should handle object with item property for arrays", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        publicsBeneficiaires: { item: ["Item1", "Item2"] } as unknown as string,
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.beneficiaries).toEqual(["Item1", "Item2"]);
    });
  });
});
