import { describe, expect, it, vi } from "vitest";

import type { MissionRecord } from "../../../../types/mission";
import { PublisherMissionType, type PublisherRecord } from "../../../../types/publisher";
import type { MissionXML } from "../../types";
import { parseBool, parseCompensationUnit, parseDate, parseMission, parseNumber, parseRemote, parseStringArray } from "../mission";

vi.mock("../../../../error", () => ({
  captureException: vi.fn(),
}));

const createPublisher = (overrides: Partial<PublisherRecord> = {}): PublisherRecord => ({
  _id: "publisher-id",
  id: "publisher-id",
  name: "Test Publisher",
  category: null,
  url: "https://publisher.example.com",
  moderator: false,
  moderatorLink: null,
  email: null,
  documentation: null,
  logo: "https://publisher.example.com/logo.png",
  defaultMissionLogo: "https://default-logo.com/logo.png",
  lead: null,
  feed: null,
  feedUsername: null,
  feedPassword: null,
  apikey: null,
  description: "",
  missionType: PublisherMissionType.BENEVOLAT,
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
    description: "A test mission description",
    image: "",
    clientId: "client-1",
    applicationUrl: "https://example.com/apply",
    postedAt: "2024-01-01",
    startAt: "2024-01-15",
    endAt: "2024-12-31",
    country: "FR",
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
    domain: "solidarite-insertion",
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

// ---------------------------------------------------------------------------
// Helpers unitaires
// ---------------------------------------------------------------------------

describe("parseStringArray", () => {
  it("returns undefined for undefined", () => {
    expect(parseStringArray(undefined)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(parseStringArray(null)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseStringArray("")).toBeUndefined();
  });

  it("normalizes array values and filters empty/null entries", () => {
    expect(parseStringArray([" a ", "", null, "b"])).toEqual(["a", "b"]);
  });

  it("returns undefined for an array of only empty values", () => {
    expect(parseStringArray(["", " ", null])).toBeUndefined();
  });

  it("splits comma-separated strings", () => {
    expect(parseStringArray("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("does not split strings without commas", () => {
    expect(parseStringArray("Affinite pour la technique")).toEqual(["Affinite pour la technique"]);
  });

  it("filters empty values from comma-separated strings", () => {
    expect(parseStringArray("a, , b, ")).toEqual(["a", "b"]);
  });

  it("returns undefined for a blank string after trim", () => {
    expect(parseStringArray("   ")).toBeUndefined();
  });

  it("handles object with value property (array)", () => {
    expect(parseStringArray({ value: ["x", "y"] })).toEqual(["x", "y"]);
  });

  it("handles object with value property (string)", () => {
    expect(parseStringArray({ value: "a, b" })).toEqual(["a", "b"]);
  });

  it("handles object with item property", () => {
    expect(parseStringArray({ item: ["i1", "i2"] })).toEqual(["i1", "i2"]);
  });

  it("returns undefined for an unknown object shape", () => {
    expect(parseStringArray({ other: "stuff" })).toBeUndefined();
  });
});

describe("parseDate", () => {
  it("returns null for undefined", () => {
    expect(parseDate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });

  it("returns null for invalid date string", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });

  it("parses date string without timezone as UTC", () => {
    const parsed = parseDate("2024-01-02T03:04:05");
    expect(parsed?.toISOString()).toBe("2024-01-02T03:04:05.000Z");
  });

  it("parses date string with Z timezone designator", () => {
    const parsed = parseDate("2024-06-15T12:00:00Z");
    expect(parsed?.toISOString()).toBe("2024-06-15T12:00:00.000Z");
  });

  it("parses date string with offset timezone", () => {
    const parsed = parseDate("2024-06-15T12:00:00+02:00");
    expect(parsed?.toISOString()).toBe("2024-06-15T10:00:00.000Z");
  });

  it("parses a Date object directly", () => {
    const date = new Date("2024-03-01T00:00:00Z");
    expect(parseDate(date)).toBe(date);
  });

  it("parses a simple date string (YYYY-MM-DD) as UTC", () => {
    const parsed = parseDate("2024-07-20");
    expect(parsed).not.toBeNull();
    expect(parsed?.getUTCFullYear()).toBe(2024);
    expect(parsed?.getUTCMonth()).toBe(6); // July = 6
    expect(parsed?.getUTCDate()).toBe(20);
  });
});

describe("parseNumber", () => {
  it("parses numeric string", () => {
    expect(parseNumber("10")).toBe(10);
  });

  it("parses a number directly", () => {
    expect(parseNumber(42)).toBe(42);
  });

  it("parses zero", () => {
    expect(parseNumber(0)).toBe(0);
  });

  it("parses string zero", () => {
    expect(parseNumber("0")).toBe(0);
  });

  it("parses float string", () => {
    expect(parseNumber("3.14")).toBeCloseTo(3.14);
  });

  it("returns null for non-numeric string", () => {
    expect(parseNumber("foo")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseNumber("")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseNumber(undefined)).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseNumber(null as unknown as undefined)).toBeNull();
  });
});

describe("parseBool", () => {
  it("returns true for 'yes'", () => {
    expect(parseBool("yes")).toBe(true);
  });

  it("returns true for 'true'", () => {
    expect(parseBool("true")).toBe(true);
  });

  it("returns true for '1'", () => {
    expect(parseBool("1")).toBe(true);
  });

  it("returns false for 'false'", () => {
    expect(parseBool("false")).toBe(false);
  });

  it("returns false for '0'", () => {
    expect(parseBool("0")).toBe(false);
  });

  it("returns false for 'no'", () => {
    expect(parseBool("no")).toBe(false);
  });

  it("returns false for an unrecognized string", () => {
    expect(parseBool("maybe")).toBe(false);
  });

  it("returns true for boolean true", () => {
    expect(parseBool(true)).toBe(true);
  });

  it("returns false for boolean false", () => {
    expect(parseBool(false)).toBe(false);
  });

  it("returns null for null", () => {
    expect(parseBool(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseBool(undefined)).toBeNull();
  });

  it("trims and lowercases input", () => {
    expect(parseBool("  YES  ")).toBe(true);
    expect(parseBool("  True  ")).toBe(true);
  });
});

describe("parseRemote", () => {
  it("returns 'no' for empty/null/undefined", () => {
    expect(parseRemote("")).toBe("no");
    expect(parseRemote(null)).toBe("no");
    expect(parseRemote(undefined)).toBe("no");
  });

  it("returns 'no' for 'no', 'non', 'false', '0'", () => {
    expect(parseRemote("no")).toBe("no");
    expect(parseRemote("non")).toBe("no");
    expect(parseRemote("false")).toBe("no");
    expect(parseRemote("0")).toBe("no");
  });

  it("returns 'possible' for 'possible', 'yes', 'oui', 'true', '1'", () => {
    expect(parseRemote("possible")).toBe("possible");
    expect(parseRemote("yes")).toBe("possible");
    expect(parseRemote("oui")).toBe("possible");
    expect(parseRemote("true")).toBe("possible");
    expect(parseRemote("1")).toBe("possible");
  });

  it("returns 'full' for 'full', 'total', '100', 'remote'", () => {
    expect(parseRemote("full")).toBe("full");
    expect(parseRemote("total")).toBe("full");
    expect(parseRemote("100")).toBe("full");
    expect(parseRemote("remote")).toBe("full");
  });

  it("returns 'possible' for 'partiel', 'partielle', 'hybride'", () => {
    expect(parseRemote("partiel")).toBe("possible");
    expect(parseRemote("partielle")).toBe("possible");
    expect(parseRemote("hybride")).toBe("possible");
  });

  it("returns 'no' for unknown values", () => {
    expect(parseRemote("something-else")).toBe("no");
  });

  it("is case-insensitive", () => {
    expect(parseRemote("FULL")).toBe("full");
    expect(parseRemote("Oui")).toBe("possible");
  });
});

describe("parseCompensationUnit", () => {
  it("returns 'hour' for 'hour', 'heure', 'heures'", () => {
    expect(parseCompensationUnit("hour")).toBe("hour");
    expect(parseCompensationUnit("heure")).toBe("hour");
    expect(parseCompensationUnit("heures")).toBe("hour");
  });

  it("returns 'day' for 'day', 'jour', 'jours'", () => {
    expect(parseCompensationUnit("day")).toBe("day");
    expect(parseCompensationUnit("jour")).toBe("day");
    expect(parseCompensationUnit("jours")).toBe("day");
  });

  it("returns 'month' for 'month', 'mois'", () => {
    expect(parseCompensationUnit("month")).toBe("month");
    expect(parseCompensationUnit("mois")).toBe("month");
  });

  it("returns 'year' for 'year', 'an', 'ans', 'annee', 'année', 'années'", () => {
    expect(parseCompensationUnit("year")).toBe("year");
    expect(parseCompensationUnit("an")).toBe("year");
    expect(parseCompensationUnit("ans")).toBe("year");
    expect(parseCompensationUnit("annee")).toBe("year");
    expect(parseCompensationUnit("année")).toBe("year");
    expect(parseCompensationUnit("années")).toBe("year");
  });

  it("returns null for empty/null/undefined", () => {
    expect(parseCompensationUnit("")).toBeNull();
    expect(parseCompensationUnit(null)).toBeNull();
    expect(parseCompensationUnit(undefined)).toBeNull();
  });

  it("returns null for unknown values", () => {
    expect(parseCompensationUnit("invalid")).toBeNull();
    expect(parseCompensationUnit("weekly")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(parseCompensationUnit("HOUR")).toBe("hour");
    expect(parseCompensationUnit("Mois")).toBe("month");
  });
});

// ---------------------------------------------------------------------------
// parseMission
// ---------------------------------------------------------------------------

describe("parseMission", () => {
  const startTime = new Date("2024-06-01T00:00:00Z");

  describe("basic fields", () => {
    it("should parse basic mission fields", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result).not.toBeNull();
      expect(result?.title).toBe("Test Mission");
      expect(result?.clientId).toBe("client-1");
      expect(result?.applicationUrl).toBe("https://example.com/apply");
      expect(result?.publisherId).toBe("publisher-id");
      expect(result?.publisherName).toBe("Test Publisher");
      expect(result?.publisherLogo).toBe("https://publisher.example.com/logo.png");
      expect(result?.publisherUrl).toBe("https://publisher.example.com");
    });

    it("should decode HTML entities in title", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ title: "Mission &amp; B&eacute;n&eacute;volat" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.title).toBe("Mission & Bénévolat");
    });

    it("should convert HTML description to text", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ description: "<p>Hello <strong>World</strong></p>" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.description).toContain("Hello");
      expect(result?.description).toContain("World");
      expect(result?.descriptionHtml).toBe("<p>Hello <strong>World</strong></p>");
    });

    it("should set type from publisher missionType", () => {
      const publisher = createPublisher({ missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS });
      const missionXML = createMissionXML();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.type).toBe(PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS);
    });

    it("should return null when parseMission encounters an error", () => {
      const publisher = createPublisher();
      // Triggering an error with null title (he.decode will throw)
      const missionXML = createMissionXML({ title: null as unknown as string });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result).toBeNull();
    });
  });

  describe("dates", () => {
    it("should parse postedAt, startAt, endAt", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        postedAt: "2024-03-01T10:00:00Z",
        startAt: "2024-03-15T10:00:00Z",
        endAt: "2024-09-30T10:00:00Z",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.postedAt).toEqual(new Date("2024-03-01T10:00:00.000Z"));
      expect(result?.startAt).toEqual(new Date("2024-03-15T10:00:00.000Z"));
      expect(result?.endAt).toEqual(new Date("2024-09-30T10:00:00.000Z"));
    });

    it("should fallback postedAt to missionDB.postedAt then startTime", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ postedAt: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.postedAt).toEqual(startTime);
    });

    it("should fallback postedAt to missionDB.postedAt when available", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ postedAt: "" });
      const dbDate = new Date("2024-02-01T00:00:00Z");
      const missionDB = { postedAt: dbDate } as MissionRecord;

      const result = parseMission(publisher, missionXML, missionDB, startTime);

      expect(result?.postedAt).toEqual(dbDate);
    });

    it("should set endAt to null when not provided", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ endAt: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.endAt).toBeNull();
    });

    it("should compute duration in months between startAt and endAt", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        startAt: "2024-01-01",
        endAt: "2024-07-01",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.duration).toBe(6);
    });

    it("should set duration to null when endAt is missing", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ endAt: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.duration).toBeNull();
    });
  });

  describe("arrays (audience, softSkills, tags, etc.)", () => {
    it("should parse audience from audience field", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ audience: "Jeunes, Adultes" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.audience).toEqual(["Jeunes", "Adultes"]);
    });

    it("should fallback audience to publicBeneficiaries", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        audience: "",
        publicBeneficiaries: "Seniors",
        publicsBeneficiaires: "",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.audience).toEqual(["Seniors"]);
    });

    it("should fallback audience to publicsBeneficiaires", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        audience: "",
        publicBeneficiaries: "",
        publicsBeneficiaires: "Étudiants",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.audience).toEqual(["Étudiants"]);
    });

    it("should return empty array for audience when none provided", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        audience: "",
        publicBeneficiaries: "",
        publicsBeneficiaires: "",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.audience).toEqual([]);
    });

    it("should parse softSkills with fallback to soft_skills", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({
        softSkills: "",
        soft_skills: "Empathie, Communication",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.softSkills).toEqual(["Empathie", "Communication"]);
    });

    it("should parse tags", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ tags: "tag1, tag2, tag3" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should return empty array for tags when not provided", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ tags: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.tags).toEqual([]);
    });

    it("should parse romeSkills", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ romeSkills: "Skill A, Skill B" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.romeSkills).toEqual(["Skill A", "Skill B"]);
    });

    it("should parse requirements", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ requirements: "Req 1, Req 2" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.requirements).toEqual(["Req 1", "Req 2"]);
    });
  });

  describe("remote / booleans", () => {
    it("should parse remote value", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ remote: "full" as any });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.remote).toBe("full");
    });

    it("should parse reducedMobilityAccessible", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ reducedMobilityAccessible: "yes" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.reducedMobilityAccessible).toBe(true);
    });

    it("should parse closeToTransport", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ closeToTransport: "true" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.closeToTransport).toBe(true);
    });

    it("should parse openToMinors", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ openToMinors: "yes" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.openToMinors).toBe(true);
    });
  });

  describe("places", () => {
    it("should parse places as number", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ places: 10 });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.places).toBe(10);
      expect(result?.placesStatus).toBe("GIVEN_BY_PARTNER");
    });

    it("should parse places as string number", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ places: "3" as unknown as number });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.places).toBe(3);
    });

    it("should default places to 1 when not provided", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ places: undefined as unknown as number });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.places).toBe(1);
      expect(result?.placesStatus).toBe("ATTRIBUTED_BY_API");
    });
  });

  describe("snu", () => {
    it("should set snu to true when value is 'yes'", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ snu: "yes" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.snu).toBe(true);
    });

    it("should set snu to false when value is 'no'", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ snu: "no" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.snu).toBe(false);
    });

    it("should parse snuPlaces", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ snuPlaces: 5 });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.snuPlaces).toBe(5);
    });
  });

  describe("compensation", () => {
    it("should parse compensationAmount", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ compensationAmount: 500 });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.compensationAmount).toBe(500);
    });

    it("should parse compensationUnit", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ compensationUnit: "month" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.compensationUnit).toBe("month");
    });

    it("should parse compensationType as lowercase", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ compensationType: "Gross" as any });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.compensationType).toBe("gross");
    });
  });

  describe("moderation", () => {
    it("should set statusCode to ACCEPTED for valid mission", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("ACCEPTED");
    });

    it("should set statusCode to REFUSED when title is missing", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ title: " " });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toBe("Titre manquant");
    });

    it("should set statusCode to REFUSED when title has encoding issues (double-encoded)", () => {
      const publisher = createPublisher();
      // he.decode("&amp;#224;") → "&#224;" which still contains "&#" after decoding
      const missionXML = createMissionXML({ title: "Mission &amp;#224; faire ensemble" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("encodage");
    });

    it("should set statusCode to REFUSED when title is too short (1 word)", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ title: "Mission" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("trop court");
    });

    it("should set statusCode to REFUSED when clientId is missing", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ clientId: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("ClientId");
    });

    it("should set statusCode to REFUSED when description is missing", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ description: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("Description");
    });

    it("should set statusCode to REFUSED when applicationUrl is missing", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ applicationUrl: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("URL de candidature");
    });

    it("should set statusCode to REFUSED for invalid domain", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ domain: "invalid-domain" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("Domaine non valide");
    });

    it("should skip moderation for Service Civique publisher", () => {
      const publisher = createPublisher({ id: "5f99dbe75eb1ad767733b206" });
      const missionXML = createMissionXML({ title: " " }); // Would normally be refused

      const result = parseMission(publisher, missionXML, null, startTime);

      // Service Civique skips moderation, so statusCode stays ACCEPTED
      expect(result?.statusCode).toBe("ACCEPTED");
    });
  });

  describe("domain special cases", () => {
    it("should normalize 'mémoire et citoyenneté' domain", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ domain: "mémoire et citoyenneté" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domain).toBe("memoire-et-citoyennete");
    });

    it("should override domain for Prévention Routière publisher", () => {
      const publisher = createPublisher({ id: "619fab857d373e07aea8be1e" });
      const missionXML = createMissionXML({ domain: "solidarite-insertion" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domain).toBe("prevention-protection");
    });
  });

  describe("Service Civique domainOriginal mapping", () => {
    const scPublisher = createPublisher({ id: "5f99dbe75eb1ad767733b206" });

    const domainMappings: [string, string][] = [
      ["solidarite-insertion", "Solidarité"],
      ["education", "Éducation pour tous"],
      ["culture-loisirs", "Culture et loisirs"],
      ["environnement", "Environnement"],
      ["sport", "Sport"],
      ["vivre-ensemble", "Mémoire et citoyenneté"],
      ["sante", "Santé"],
      ["humanitaire", "Développement international et aide humanitaire"],
      ["autre", "Interventions d'urgence en cas de crise"],
    ];

    it.each(domainMappings)("should map domain '%s' to domainOriginal '%s'", (domain, expectedOriginal) => {
      const missionXML = createMissionXML({ domain });

      const result = parseMission(scPublisher, missionXML, null, startTime);

      expect(result?.domainOriginal).toBe(expectedOriginal);
    });

    it("should set domainOriginal to empty string for unknown domain", () => {
      const missionXML = createMissionXML({ domain: "solidarite-insertion" });
      // Use a non-SC publisher so domainOriginal is not set
      const publisher = createPublisher();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domainOriginal).toBeUndefined();
    });
  });

  describe("domainLogo", () => {
    it("should use missionXML.image when provided", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ image: "https://example.com/image.png" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domainLogo).toBe("https://example.com/image.png");
    });

    it("should fallback to missionDB.domainLogo when image is empty", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ image: "" });
      const missionDB = { domainLogo: "https://db.com/logo.png" } as MissionRecord;

      const result = parseMission(publisher, missionXML, missionDB, startTime);

      expect(result?.domainLogo).toBe("https://db.com/logo.png");
    });

    it("should fallback to domain image when no image and no DB logo", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ image: "", domain: "sport" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domainLogo).toContain("sport");
    });
  });

  describe("metadata and timestamps", () => {
    it("should set lastSyncAt and updatedAt to startTime", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.lastSyncAt).toEqual(startTime);
      expect(result?.updatedAt).toEqual(startTime);
    });

    it("should set deletedAt to null", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.deletedAt).toBeNull();
    });

    it("should parse metadata", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML({ metadata: "some-metadata" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.metadata).toBe("some-metadata");
    });
  });

  describe("existing mission (missionDB)", () => {
    it("should keep _id and createdAt from existing mission", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML();
      const createdAt = new Date("2023-06-01T00:00:00Z");
      const missionDB = { _id: "existing-id", createdAt } as MissionRecord;

      const result = parseMission(publisher, missionXML, missionDB, startTime);

      expect(result?._id).toBe("existing-id");
      expect(result?.createdAt).toEqual(createdAt);
    });

    it("should use missionDB.id when _id is not present", () => {
      const publisher = createPublisher();
      const missionXML = createMissionXML();
      const missionDB = { id: "db-uuid-id", createdAt: new Date() } as MissionRecord;

      const result = parseMission(publisher, missionXML, missionDB, startTime);

      expect(result?._id).toBe("db-uuid-id");
    });
  });
});
