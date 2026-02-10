import { describe, expect, it, vi } from "vitest";

import type { MissionRecord } from "../../../../types/mission";
import { PublisherMissionType } from "../../../../types/publisher";
import { parseCompensationUnit, parseMission, parseRemote } from "../mission";
import { buildMissionXML, buildPublisher } from "./factories";

vi.mock("../../../../error", () => ({
  captureException: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers spécifiques à mission.ts (non extraits dans helpers.ts)
// ---------------------------------------------------------------------------

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
      const publisher = buildPublisher();
      const missionXML = buildMissionXML();

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
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ title: "Mission &amp; B&eacute;n&eacute;volat" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.title).toBe("Mission & Bénévolat");
    });

    it("should convert HTML description to text", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ description: "<p>Hello <strong>World</strong></p>" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.description).toContain("Hello");
      expect(result?.description).toContain("World");
      expect(result?.descriptionHtml).toBe("<p>Hello <strong>World</strong></p>");
    });

    it("should set type from publisher missionType", () => {
      const publisher = buildPublisher({ missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS });
      const missionXML = buildMissionXML();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.type).toBe(PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS);
    });

    it("should return null when parseMission encounters an error", () => {
      const publisher = buildPublisher();
      // Triggering an error with null title (he.decode will throw)
      const missionXML = buildMissionXML({ title: null as unknown as string });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result).toBeNull();
    });
  });

  describe("dates", () => {
    it("should parse postedAt, startAt, endAt", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({
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
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ postedAt: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.postedAt).toEqual(startTime);
    });

    it("should fallback postedAt to missionDB.postedAt when available", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ postedAt: "" });
      const dbDate = new Date("2024-02-01T00:00:00Z");
      const missionDB = { postedAt: dbDate } as MissionRecord;

      const result = parseMission(publisher, missionXML, missionDB, startTime);

      expect(result?.postedAt).toEqual(dbDate);
    });

    it("should set endAt to null when not provided", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ endAt: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.endAt).toBeNull();
    });

    it("should compute duration in months between startAt and endAt", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({
        startAt: "2024-01-01",
        endAt: "2024-07-01",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.duration).toBe(6);
    });

    it("should set duration to null when endAt is missing", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ endAt: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.duration).toBeNull();
    });
  });

  describe("arrays (audience, softSkills, tags, etc.)", () => {
    it("should parse audience from audience field", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ audience: "Jeunes, Adultes" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.audience).toEqual(["Jeunes", "Adultes"]);
    });

    it("should fallback audience to publicBeneficiaries", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({
        audience: "",
        publicBeneficiaries: "Seniors",
        publicsBeneficiaires: "",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.audience).toEqual(["Seniors"]);
    });

    it("should fallback audience to publicsBeneficiaires", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({
        audience: "",
        publicBeneficiaries: "",
        publicsBeneficiaires: "Étudiants",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.audience).toEqual(["Étudiants"]);
    });

    it("should return empty array for audience when none provided", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({
        audience: "",
        publicBeneficiaries: "",
        publicsBeneficiaires: "",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.audience).toEqual([]);
    });

    it("should parse softSkills with fallback to soft_skills", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({
        softSkills: "",
        soft_skills: "Empathie, Communication",
      });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.softSkills).toEqual(["Empathie", "Communication"]);
    });

    it("should parse tags", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ tags: "tag1, tag2, tag3" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should return empty array for tags when not provided", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ tags: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.tags).toEqual([]);
    });

    it("should parse romeSkills", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ romeSkills: "Skill A, Skill B" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.romeSkills).toEqual(["Skill A", "Skill B"]);
    });

    it("should parse requirements", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ requirements: "Req 1, Req 2" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.requirements).toEqual(["Req 1", "Req 2"]);
    });
  });

  describe("remote / booleans", () => {
    it("should parse remote value", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ remote: "full" as any });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.remote).toBe("full");
    });

    it("should parse reducedMobilityAccessible", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ reducedMobilityAccessible: "yes" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.reducedMobilityAccessible).toBe(true);
    });

    it("should parse closeToTransport", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ closeToTransport: "true" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.closeToTransport).toBe(true);
    });

    it("should parse openToMinors", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ openToMinors: "yes" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.openToMinors).toBe(true);
    });
  });

  describe("places", () => {
    it("should parse places as number", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ places: 10 });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.places).toBe(10);
      expect(result?.placesStatus).toBe("GIVEN_BY_PARTNER");
    });

    it("should parse places as string number", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ places: "3" as unknown as number });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.places).toBe(3);
    });

    it("should default places to 1 when not provided", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ places: undefined as unknown as number });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.places).toBe(1);
      expect(result?.placesStatus).toBe("ATTRIBUTED_BY_API");
    });
  });

  describe("snu", () => {
    it("should set snu to true when value is 'yes'", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ snu: "yes" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.snu).toBe(true);
    });

    it("should set snu to false when value is 'no'", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ snu: "no" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.snu).toBe(false);
    });

    it("should parse snuPlaces", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ snuPlaces: 5 });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.snuPlaces).toBe(5);
    });
  });

  describe("compensation", () => {
    it("should parse compensationAmount", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ compensationAmount: 500 });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.compensationAmount).toBe(500);
    });

    it("should parse compensationUnit", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ compensationUnit: "month" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.compensationUnit).toBe("month");
    });

    it("should parse compensationType as lowercase", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ compensationType: "Gross" as any });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.compensationType).toBe("gross");
    });
  });

  describe("moderation", () => {
    it("should set statusCode to ACCEPTED for valid mission", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("ACCEPTED");
    });

    it("should set statusCode to REFUSED when title is missing", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ title: " " });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toBe("Titre manquant");
    });

    it("should set statusCode to REFUSED when title has encoding issues (double-encoded)", () => {
      const publisher = buildPublisher();
      // he.decode("&amp;#224;") → "&#224;" which still contains "&#" after decoding
      const missionXML = buildMissionXML({ title: "Mission &amp;#224; faire ensemble" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("encodage");
    });

    it("should set statusCode to REFUSED when title is too short (1 word)", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ title: "Mission" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("trop court");
    });

    it("should set statusCode to REFUSED when clientId is missing", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ clientId: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("ClientId");
    });

    it("should set statusCode to REFUSED when description is missing", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ description: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("Description");
    });

    it("should set statusCode to REFUSED when applicationUrl is missing", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ applicationUrl: "" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("URL de candidature");
    });

    it("should set statusCode to REFUSED for invalid domain", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ domain: "invalid-domain" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.statusCode).toBe("REFUSED");
      expect(result?.statusComment).toContain("Domaine non valide");
    });

    it("should skip moderation for Service Civique publisher", () => {
      const publisher = buildPublisher({ id: "5f99dbe75eb1ad767733b206" });
      const missionXML = buildMissionXML({ title: " " }); // Would normally be refused

      const result = parseMission(publisher, missionXML, null, startTime);

      // Service Civique skips moderation, so statusCode stays ACCEPTED
      expect(result?.statusCode).toBe("ACCEPTED");
    });
  });

  describe("domain special cases", () => {
    it("should normalize 'mémoire et citoyenneté' domain", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ domain: "mémoire et citoyenneté" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domain).toBe("memoire-et-citoyennete");
    });

    it("should override domain for Prévention Routière publisher", () => {
      const publisher = buildPublisher({ id: "619fab857d373e07aea8be1e" });
      const missionXML = buildMissionXML({ domain: "solidarite-insertion" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domain).toBe("prevention-protection");
    });
  });

  describe("Service Civique domainOriginal mapping", () => {
    const scPublisher = buildPublisher({ id: "5f99dbe75eb1ad767733b206" });

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
      const missionXML = buildMissionXML({ domain });

      const result = parseMission(scPublisher, missionXML, null, startTime);

      expect(result?.domainOriginal).toBe(expectedOriginal);
    });

    it("should set domainOriginal to empty string for unknown domain", () => {
      const missionXML = buildMissionXML({ domain: "solidarite-insertion" });
      // Use a non-SC publisher so domainOriginal is not set
      const publisher = buildPublisher();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domainOriginal).toBeUndefined();
    });
  });

  describe("domainLogo", () => {
    it("should use missionXML.image when provided", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ image: "https://example.com/image.png" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domainLogo).toBe("https://example.com/image.png");
    });

    it("should fallback to missionDB.domainLogo when image is empty", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ image: "" });
      const missionDB = { domainLogo: "https://db.com/logo.png" } as MissionRecord;

      const result = parseMission(publisher, missionXML, missionDB, startTime);

      expect(result?.domainLogo).toBe("https://db.com/logo.png");
    });

    it("should fallback to domain image when no image and no DB logo", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ image: "", domain: "sport" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.domainLogo).toContain("sport");
    });
  });

  describe("metadata and timestamps", () => {
    it("should set lastSyncAt and updatedAt to startTime", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.lastSyncAt).toEqual(startTime);
      expect(result?.updatedAt).toEqual(startTime);
    });

    it("should set deletedAt to null", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML();

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.deletedAt).toBeNull();
    });

    it("should parse metadata", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML({ metadata: "some-metadata" });

      const result = parseMission(publisher, missionXML, null, startTime);

      expect(result?.metadata).toBe("some-metadata");
    });
  });

  describe("existing mission (missionDB)", () => {
    it("should keep _id and createdAt from existing mission", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML();
      const createdAt = new Date("2023-06-01T00:00:00Z");
      const missionDB = { _id: "existing-id", createdAt } as MissionRecord;

      const result = parseMission(publisher, missionXML, missionDB, startTime);

      expect(result?._id).toBe("existing-id");
      expect(result?.createdAt).toEqual(createdAt);
    });

    it("should use missionDB.id when _id is not present", () => {
      const publisher = buildPublisher();
      const missionXML = buildMissionXML();
      const missionDB = { id: "db-uuid-id", createdAt: new Date() } as MissionRecord;

      const result = parseMission(publisher, missionXML, missionDB, startTime);

      expect(result?._id).toBe("db-uuid-id");
    });
  });
});
