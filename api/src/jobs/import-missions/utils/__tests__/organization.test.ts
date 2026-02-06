import { describe, expect, it, vi } from "vitest";
import type { PublisherRecord } from "../../../../types/publisher";
import type { MissionXML } from "../../types";
import { parseOrganization, parseOrganizationClientId } from "../organization";

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

describe("parseOrganizationClientId", () => {
  describe("organizationClientId / organizationId", () => {
    it("should return organizationClientId when provided", () => {
      const missionXML = createMissionXML({
        organizationClientId: "client-org-id",
        organizationId: "fallback-org-id",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("client-org-id");
    });

    it("should fallback to organizationId when organizationClientId is empty", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "fallback-org-id",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("fallback-org-id");
    });

    it("should prefer organizationClientId over organizationId", () => {
      const missionXML = createMissionXML({
        organizationClientId: "preferred-id",
        organizationId: "other-id",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("preferred-id");
    });
  });

  describe("RNA fallback", () => {
    it("should fallback to normalized organizationRNA when no clientId/organizationId", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "w123456789",
        organizationRna: "",
        organizationSiren: "",
        organizationName: "",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("W123456789");
    });

    it("should fallback to organizationRna when organizationRNA is empty", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "w987654321",
        organizationSiren: "",
        organizationName: "",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("W987654321");
    });

    it("should remove special characters and uppercase RNA", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "W-123-456-789",
        organizationRna: "",
        organizationSiren: "",
        organizationName: "",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("W123456789");
    });
  });

  describe("SIREN/SIRET fallback", () => {
    it("should fallback to SIRET when no clientId, organizationId, or RNA", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "12345678901234",
        organizationName: "",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("12345678901234");
    });

    it("should fallback to SIREN when SIRET is not valid but SIREN is", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "123456789",
        organizationName: "",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("123456789");
    });

    it("should skip invalid SIREN/SIRET", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "invalid",
        organizationName: "Fallback Name",
      });

      // Falls through to slugified name
      expect(parseOrganizationClientId(missionXML)).toBe("fallback-name");
    });
  });

  describe("organizationName fallback", () => {
    it("should fallback to slugified organizationName when no other identifier", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "",
        organizationName: "Mon Association",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("mon-association");
    });

    it("should slugify special characters in organizationName", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "",
        organizationName: "Médecins du Monde & Associés",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("medecins-du-monde-and-associes");
    });
  });

  describe("null case", () => {
    it("should return null when no identifier is available", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "",
        organizationName: "",
      });

      expect(parseOrganizationClientId(missionXML)).toBeNull();
    });

    it("should return null when all identifiers are undefined", () => {
      const missionXML = createMissionXML({
        organizationClientId: undefined as unknown as string,
        organizationId: undefined as unknown as string,
        organizationRNA: undefined as unknown as string,
        organizationRna: undefined as unknown as string,
        organizationSiren: undefined as unknown as string,
        organizationName: undefined as unknown as string,
      });

      expect(parseOrganizationClientId(missionXML)).toBeNull();
    });
  });

  describe("priority order", () => {
    it("should prefer organizationClientId over RNA, SIREN and name", () => {
      const missionXML = createMissionXML({
        organizationClientId: "client-id",
        organizationRNA: "W123456789",
        organizationSiren: "123456789",
        organizationName: "Mon Asso",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("client-id");
    });

    it("should prefer RNA over SIREN and name when no clientId/organizationId", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "W123456789",
        organizationSiren: "123456789",
        organizationName: "Mon Asso",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("W123456789");
    });

    it("should prefer SIREN over name when no clientId/organizationId or RNA", () => {
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "123456789",
        organizationName: "Mon Asso",
      });

      expect(parseOrganizationClientId(missionXML)).toBe("123456789");
    });
  });
});

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

    it("should return null when no organization identifier can be resolved", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "",
        organizationName: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result).toBeNull();
    });
  });

  describe("clientId delegation to parseOrganizationClientId", () => {
    it("should use organizationClientId as clientId", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationClientId: "client-org-id",
        organizationId: "fallback-org-id",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.clientId).toBe("client-org-id");
    });

    it("should fallback to organizationId when organizationClientId is empty", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "fallback-org-id",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.clientId).toBe("fallback-org-id");
    });

    it("should fallback to RNA as clientId", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "w123456789",
        organizationSiren: "",
        organizationName: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.clientId).toBe("W123456789");
    });

    it("should fallback to SIRET as clientId", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "12345678901234",
        organizationName: "",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.clientId).toBe("12345678901234");
    });

    it("should fallback to slugified name as clientId", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        organizationClientId: "",
        organizationId: "",
        organizationRNA: "",
        organizationRna: "",
        organizationSiren: "",
        organizationName: "Mon Association",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.clientId).toBe("mon-association");
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
    it("should set verified fields to null", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML();

      const result = parseOrganization(publisher, missionXML);

      expect(result?.verifiedAt).toBeNull();
      expect(result?.organizationIdVerified).toBeNull();
    });
  });

  describe("Service Civique parentOrganizations", () => {
    it("should use parentOrganizationName when publisher is Service Civique", () => {
      const publisher = createPublisher({ id: "5f99dbe75eb1ad767733b206" });
      const missionXML = createMissionXML({
        parentOrganizationName: "Parent Réseau SC",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.parentOrganizations).toEqual(["Parent Réseau SC"]);
    });

    it("should handle parentOrganizationName as array for Service Civique", () => {
      const publisher = createPublisher({ id: "5f99dbe75eb1ad767733b206" });
      const missionXML = createMissionXML({
        parentOrganizationName: ["Réseau A", "Réseau B"] as unknown as string,
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.parentOrganizations).toEqual(["Réseau A", "Réseau B"]);
    });

    it("should fallback to organizationName when parentOrganizationName is empty for Service Civique", () => {
      const publisher = createPublisher({ id: "5f99dbe75eb1ad767733b206" });
      const missionXML = createMissionXML({
        parentOrganizationName: "",
        organizationName: "Asso SC",
      });

      const result = parseOrganization(publisher, missionXML);

      expect(result?.parentOrganizations).toEqual(["Asso SC"]);
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
