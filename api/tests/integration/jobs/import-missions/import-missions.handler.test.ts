import { readFile } from "fs/promises";
import path from "path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportMissionsHandler } from "../../../../src/jobs/import-missions/handler";
import ImportModel from "../../../../src/models/import";
import MissionModel from "../../../../src/models/mission";
import { createTestImport, createTestMission, createTestPublisher } from "../../../fixtures";

const originalFetch = global.fetch;
global.fetch = vi.fn();

const emptyXml = `<?xml version="1.0" encoding="UTF-8"?><missions></missions>`;

/**
 * Import missions job (integration test)
 * Checks the import of missions from a feed XML
 */
describe("Import missions job (integration test)", () => {
  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    (global.fetch as any).mockReset();
  });

  const handler = new ImportMissionsHandler();

  it("Imports missions from a feed XML with correct structure and one mission", async () => {
    const xml = await readFile(path.join(__dirname, "data/correct-feed.xml"), "utf-8");
    const publisher = await createTestPublisher({ feed: "https://fixture-feed" });
    (global.fetch as any).mockResolvedValueOnce({ text: async () => xml });

    const result = await handler.handle({ publisherId: publisher._id.toString() });

    const missions = await MissionModel.find({ publisherId: publisher._id.toString() });
    expect(missions.length).toBeGreaterThan(0);
    expect(result.success).toBe(true);
    expect(result.imports[0].status).toBe("SUCCESS");

    const mission = missions[0];

    expect(mission.addresses).toBeDefined();
    expect(mission.addresses.length).toBe(2);
    expect(mission.addresses[0]).toMatchObject({
      street: "46 Rue Saint-Antoine",
      city: "Paris",
      postalCode: "75004",
      departmentCode: "75",
      departmentName: "Paris",
      region: "Île-de-France",
      country: "FR",
      location: {
        lat: 48.8541,
        lon: 2.3643,
      },
      geoPoint: {
        type: "Point",
        coordinates: [2.3643, 48.8541],
      },
      geolocStatus: "ENRICHED_BY_PUBLISHER",
    });
    expect(mission.activity).toBe("logistique");
    expect(mission.audience).toEqual(["Tous"]);
    expect(mission.clientId).toBe("32132143");
    expect(mission.description).toBe("Description de la mission");
    expect(mission.domain).toBe("environnement");
    expect(mission.duration).toBe(10);
    expect(mission.endAt?.toISOString()).toBe("2025-10-31T23:00:00.000Z"); // TODO: GMT issue?
    expect(mission.openToMinors).toBe("yes");
    expect(mission.organizationBeneficiaries).toEqual(["Tous"]);
    expect(mission.organizationCity).toBe("Paris");
    expect(mission.organizationClientId).toBe("123312321");
    expect(mission.organizationFullAddress).toBe("55 Rue du Faubourg Saint-Honoré 75008 Paris");
    expect(mission.organizationName).toBe("Mon asso");
    expect(mission.organizationPostCode).toBe("75008");
    expect(mission.organizationRNA).toBe("W922000733");
    expect(mission.organizationSiren).toBe("332737394");
    expect(mission.organizationStatusJuridique).toBe("Association");
    expect(mission.organizationType).toBe("1901");
    expect(mission.organizationUrl).toBe("https://www.organizationname.com");
    expect(mission.places).toBe(2);
    expect(mission.publisherId).toBe(publisher._id.toString());
    expect(mission.remote).toBe("full");
    expect(mission.schedule).toBe("1 demi-journée par semaine");
    expect(mission.startAt.toISOString()).toBe("2024-12-31T23:00:00.000Z"); // TODO: GMT issue?
    expect(mission.tags).toEqual(expect.arrayContaining(["environnement", "écologie"]));
    expect(mission.title).toBe("Titre de la mission");
  });

  it("If feed is empty for the first time, missions related to publisher should not be deleted", async () => {
    const publisher = await createTestPublisher({ feed: "https://empty-feed" });
    await createTestMission({ publisherId: publisher._id.toString(), clientId: "client-old" });
    await createTestImport({ publisherId: publisher._id.toString(), status: "SUCCESS" });
    (global.fetch as any).mockResolvedValueOnce({ text: async () => emptyXml });

    const result = await handler.handle({ publisherId: publisher._id.toString() });

    const onlineMissions = await MissionModel.find({ publisherId: publisher._id.toString(), deleted: false });
    const failedImports = await ImportModel.find({ publisherId: publisher._id.toString(), status: "FAILED" });

    expect(onlineMissions.length).toBe(1);
    expect(result.success).toBe(true);
    expect(result.imports[0].status).toBe("FAILED");
    expect(failedImports.length).toBe(1);
    expect(failedImports[0].deletedCount).toBe(0);
    expect(failedImports[0].status).toBe("FAILED");
    expect(failedImports[0].error).toBe("Empty xml");
  });

  it("If feed is empty and no import is successful for 7 days, missions should be deleted", async () => {
    const publisher = await createTestPublisher({ feed: "https://empty-feed" });
    await createTestMission({ publisherId: publisher._id.toString(), clientId: "client-old" });
    await createTestImport({ publisherId: publisher._id.toString(), status: "FAILED", endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) });
    await createTestImport({ publisherId: publisher._id.toString(), status: "FAILED", endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) });
    (global.fetch as any).mockResolvedValueOnce({ text: async () => emptyXml });

    await handler.handle({ publisherId: publisher._id.toString() });

    const deletedMissions = await MissionModel.find({ publisherId: publisher._id.toString(), deleted: true });

    expect(deletedMissions.length).toBe(1);
  });

  it("If publisher has no feed, skip import", async () => {
    const publisher = await createTestPublisher({ feed: undefined });
    const result = await handler.handle({ publisherId: publisher._id.toString() });
    expect((global.fetch as any).mock.calls.length).toBe(0);
    expect(result.imports.length).toBe(0);
    expect(result.success).toBe(true);
  });

  it("If feed returns a network error, import should fail", async () => {
    const publisher = await createTestPublisher({ feed: "https://error-feed" });
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));
    const result = await handler.handle({ publisherId: publisher._id.toString() });
    expect(result.imports[0].status).toBe("FAILED");
    expect(result.imports[0].error).toMatch(/Network error/);
  });

  it("If feed XML is malformed, import should fail with explicit error", async () => {
    const malformedXml = `<missions><mission><title>Oops</title></mission>`; // missing closing tags
    const publisher = await createTestPublisher({ feed: "https://malformed-feed" });
    (global.fetch as any).mockResolvedValueOnce({ text: async () => malformedXml });
    const result = await handler.handle({ publisherId: publisher._id.toString() });
    expect(result.imports[0].status).toBe("FAILED");
  });

  it("If publisher has feedUsername/feedPassword, Authorization header is sent", async () => {
    const xml = await readFile(path.join(__dirname, "data/correct-feed.xml"), "utf-8");
    const publisher = await createTestPublisher({
      feed: "https://auth-feed",
      feedUsername: "user",
      feedPassword: "pass",
    });
    (global.fetch as any).mockImplementationOnce((url: string, options: any) => {
      expect(url).toBe("https://auth-feed");
      expect(options).toBeDefined();
      expect(options.headers).toBeDefined();
      const auth = options.headers.get("Authorization");
      expect(auth).toMatch(/^Basic /);
      return Promise.resolve({ text: async () => xml });
    });
    const result = await handler.handle({ publisherId: publisher._id.toString() });
    expect(result.imports[0].status).toBe("SUCCESS");
  });

  it("If mission already exists, it is updated and not duplicated", async () => {
    const xml = await readFile(path.join(__dirname, "data/correct-feed.xml"), "utf-8");
    const publisher = await createTestPublisher({ feed: "https://fixture-feed" });
    // Create a mission with the same clientId as the one in the XML
    await createTestMission({
      publisherId: publisher._id.toString(),
      clientId: "32132143",
      title: "Ancien titre",
      description: "Ancienne description",
      organizationName: "Ancienne asso",
    });

    (global.fetch as any).mockResolvedValueOnce({ text: async () => xml });
    const result = await handler.handle({ publisherId: publisher._id.toString() });
    expect(result.imports[0].status).toBe("SUCCESS");

    const missions = await MissionModel.find({ publisherId: publisher._id.toString(), clientId: "32132143" });
    expect(missions.length).toBe(1);
    const mission = missions[0];
    expect(mission.title).toBe("Titre de la mission");
    expect(mission.description).toBe("Description de la mission");
    expect(mission.organizationName).toBe("Mon asso");
  });

  it("If mission already exists and has no new data, it is not updated", async () => {
    const xml = await readFile(path.join(__dirname, "data/correct-feed.xml"), "utf-8");
    const publisher = await createTestPublisher({ feed: "https://fixture-feed" });

    // Import feed once to create mission
    (global.fetch as any).mockResolvedValueOnce({ text: async () => xml });
    await handler.handle({ publisherId: publisher._id.toString() });

    // Update updatedAt to simulate older mission
    await MissionModel.updateOne({ publisherId: publisher._id.toString(), clientId: "32132143" }, { updatedAt: new Date("2025-01-01") }, { timestamps: false });

    // Import feed again to update mission (no change)
    (global.fetch as any).mockResolvedValueOnce({ text: async () => xml });
    await handler.handle({ publisherId: publisher._id.toString() });

    const missions = await MissionModel.find({ publisherId: publisher._id.toString(), clientId: "32132143" });

    expect(missions.length).toBe(1);
    const mission = missions[0];
    expect(mission.updatedAt.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("If startAt is not defined in XML, uses default on first import and preserves DB value on updates", async () => {
    // Create XML without startAt field
    const xmlWithoutStartAt = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher><![CDATA[Example Job Site]]></publisher>
  <publisherurl><![CDATA[http://www.examplemissionsite.com]]></publisherurl>
  <lastBuildDate><![CDATA[Fri, 10 March 2020 22:49:39 GMT]]></lastBuildDate>
  <mission>
    <title><![CDATA[Mission sans date de début]]></title>
    <clientId><![CDATA[TEST_NO_START_DATE]]></clientId>
    <description><![CDATA[Mission de test sans startAt]]></description>
    <applicationUrl><![CDATA[https://www.example.org]]></applicationUrl>
    <postedAt><![CDATA[01/01/2023]]></postedAt>
    <endAt><![CDATA[11/01/2025]]></endAt>
    <addresses>
      <address>
        <street><![CDATA[Test Street]]></street>
        <postalCode><![CDATA[75001]]></postalCode>
        <city><![CDATA[Paris]]></city>
        <departmentCode><![CDATA[75]]></departmentCode>
        <departmentName><![CDATA[Paris]]></departmentName>
        <region><![CDATA[Île-de-France]]></region>
        <country><![CDATA[France]]></country>
      </address>
    </addresses>
    <schedule><![CDATA[Flexible]]></schedule>
    <places><![CDATA[1]]></places>
    <activity><![CDATA[test]]></activity>
    <remote><![CDATA[no]]></remote>
    <domain><![CDATA[test]]></domain>
    <organizationName><![CDATA[Test Org]]></organizationName>
    <organizationType><![CDATA[1901]]></organizationType>
  </mission>
</source>`;

    const publisher = await createTestPublisher({ feed: "https://no-start-date-feed" });

    // First import - should use default startAt (current date)
    const importDate = new Date();
    (global.fetch as any).mockResolvedValueOnce({ text: async () => xmlWithoutStartAt });

    const result = await handler.handle({ publisherId: publisher._id.toString() });
    expect(result.success).toBe(true);
    expect(result.imports[0].status).toBe("SUCCESS");

    const missions = await MissionModel.find({ publisherId: publisher._id.toString(), clientId: "TEST_NO_START_DATE" });
    expect(missions.length).toBe(1);

    const mission = missions[0];
    expect(mission.title).toBe("Mission sans date de début");

    // startAt should be set to a default value (around the import date)
    const timeDiff = Math.abs(mission.startAt.getTime() - importDate.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds of import

    const originalStartAt = mission.startAt;

    // Wait a moment to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second import with same XML (no startAt) - should preserve the existing startAt from DB
    const secondImportDate = new Date();
    (global.fetch as any).mockResolvedValueOnce({ text: async () => xmlWithoutStartAt });

    const result2 = await handler.handle({ publisherId: publisher._id.toString() });
    expect(result2.success).toBe(true);
    expect(result2.imports[0].status).toBe("SUCCESS");

    const missionsAfterUpdate = await MissionModel.find({ publisherId: publisher._id.toString(), clientId: "TEST_NO_START_DATE" });
    expect(missionsAfterUpdate.length).toBe(1);

    const updatedMission = missionsAfterUpdate[0];

    // startAt should be preserved from the first import, not changed to the second import date
    expect(updatedMission.startAt.toISOString()).toBe(originalStartAt.toISOString());
    // The mission should exist and have the preserved startAt, which should be different from second import date
    expect(Math.abs(updatedMission.startAt.getTime() - secondImportDate.getTime())).toBeGreaterThan(0);
  });
});
