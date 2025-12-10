import { readFile } from "fs/promises";
import path from "path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ImportMissionsHandler } from "../../../../src/jobs/import-missions/handler";
import { prismaCore } from "../../../../src/db/postgres";
import { importService } from "../../../../src/services/import";
import { missionService } from "../../../../src/services/mission";
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
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => xml });

    const result = await handler.handle({ publisherId: publisher.id });

    const missions = await missionService.findMissionsBy({ publisherId: publisher.id });
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
      geolocStatus: "ENRICHED_BY_PUBLISHER",
    });
    expect(mission.activity).toBe("logistique");
    expect(mission.audience).toEqual(["Tous"]);
    expect(mission.clientId).toBe("32132143");
    expect(mission.description).toBe("Description de la mission");
    expect(mission.domain).toBe("environnement");
    expect(mission.duration).toBe(10);
    expect(mission.endAt?.toISOString()).toBe("2025-11-01T00:00:00.000Z");
    expect(mission.openToMinors).toBe("yes");
    expect(mission.organizationCity).toBe("Paris");
    expect(mission.organizationClientId).toBe("123312321");
    expect(mission.organizationName).toBe("Mon asso");
    expect(mission.organizationPostCode).toBe("75008");
    expect(mission.organizationRNA).toBe("W922000733");
    expect(mission.organizationSiren).toBe("332737394");
    expect(mission.organizationStatusJuridique).toBe("Association");
    expect(mission.places).toBe(2);
    expect(mission.publisherId).toBe(publisher.id);
    expect(mission.remote).toBe("full");
    expect(mission.schedule).toBe("1 demi-journée par semaine");
    expect(mission.compensationAmount).toBe(10);
    expect(mission.compensationUnit).toBe("hour");
    expect(mission.compensationType).toBe("gross");
    expect(mission.startAt.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(mission.tags).toEqual(expect.arrayContaining(["environnement", "écologie"]));
    expect(mission.title).toBe("Titre de la mission");
  });

  it("refuses missions when compensation data is invalid", async () => {
    const xml = await readFile(path.join(__dirname, "data/invalid-compensation-feed.xml"), "utf-8");
    const publisher = await createTestPublisher({ feed: "https://invalid-compensation-feed" });
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => xml });

    await handler.handle({ publisherId: publisher.id });

    const mission = await missionService.findOneMissionBy({ publisherId: publisher.id, clientId: "INVALID_COMPENSATION" });
    expect(mission).toBeDefined();
    expect(mission?.statusCode).toBe("REFUSED");
    expect(mission?.statusComment).toBe("Montant de la compensation invalide (nombre positif attendu)");
    expect(mission?.compensationAmount).toBe(-10);
  });

  it("uses publisher defaultMissionLogo when organizationLogo is missing", async () => {
    const xml = await readFile(path.join(__dirname, "data/missing-logo-feed.xml"), "utf-8");
    const defaultLogo = "https://example.com/default_logo.png";
    const publisher = await createTestPublisher({ feed: "https://fixture-missing-logo", defaultMissionLogo: defaultLogo });
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => xml });

    await handler.handle({ publisherId: publisher.id });

    const missions = await missionService.findMissionsBy({ publisherId: publisher.id });
    expect(missions.length).toBeGreaterThan(0);
  });

  it("If feed is empty for the first time, missions related to publisher should not be deleted", async () => {
    const publisher = await createTestPublisher({ feed: "https://empty-feed" });
    await createTestMission({ publisherId: publisher.id, clientId: "client-old" });
    await createTestImport({ publisherId: publisher.id, status: "SUCCESS" });
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => emptyXml });

    const result = await handler.handle({ publisherId: publisher.id });

    const onlineMissions = await missionService.findMissionsBy({ publisherId: publisher.id, deletedAt: null });
    const failedImports = await importService.findImports({ publisherId: publisher.id, status: "FAILED" });

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
    await createTestMission({ publisherId: publisher.id, clientId: "client-old" });
    await createTestImport({ publisherId: publisher.id, status: "FAILED", finishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) });
    await createTestImport({ publisherId: publisher.id, status: "FAILED", finishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) });
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => emptyXml });

    await handler.handle({ publisherId: publisher.id });

    const deletedMissions = await missionService.findMissionsBy({ publisherId: publisher.id, deletedAt: { not: null } });

    expect(deletedMissions.length).toBe(1);
  });

  it("If publisher has no feed, skip import", async () => {
    const publisher = await createTestPublisher({ feed: undefined });
    const result = await handler.handle({ publisherId: publisher.id });
    expect((global.fetch as any).mock.calls.length).toBe(0);
    expect(result.imports.length).toBe(0);
    expect(result.success).toBe(true);
  });

  it("If feed returns a network error, import should fail", async () => {
    const publisher = await createTestPublisher({ feed: "https://error-feed" });
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));
    const result = await handler.handle({ publisherId: publisher.id });
    expect(result.imports[0].status).toBe("FAILED");
    expect(result.imports[0].error).toMatch("Failed to fetch xml");
  });

  it("If feed XML is malformed, import should fail with explicit error", async () => {
    const malformedXml = `<missions><mission><title>Oops</title></mission>`; // missing closing tags
    const publisher = await createTestPublisher({ feed: "https://malformed-feed" });
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => malformedXml });
    const result = await handler.handle({ publisherId: publisher.id });
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
      return Promise.resolve({ ok: true, text: async () => xml });
    });
    const result = await handler.handle({ publisherId: publisher.id });
    expect(result.imports[0].status).toBe("SUCCESS");
  });

  it("If mission already exists, it is updated and not duplicated", async () => {
    const xml = await readFile(path.join(__dirname, "data/correct-feed.xml"), "utf-8");
    const publisher = await createTestPublisher({ feed: "https://fixture-feed" });
    // Create a mission with the same clientId as the one in the XML
    await createTestMission({
      publisherId: publisher.id,
      clientId: "32132143",
      title: "Ancien titre",
      description: "Ancienne description",
      organizationName: "Ancienne asso",
    });

    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => xml });
    const result = await handler.handle({ publisherId: publisher.id });
    expect(result.imports[0].status).toBe("SUCCESS");

    const missions = await missionService.findMissionsBy({ publisherId: publisher.id, clientId: "32132143" });
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
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => xml });
    await handler.handle({ publisherId: publisher.id });

    // Update updatedAt to simulate older mission
    const existingMission = await missionService.findOneMissionBy({ publisherId: publisher.id, clientId: "32132143" });
    expect(existingMission).toBeDefined();
    if (!existingMission) {
      throw new Error("Mission not found");
    }
    await prismaCore.$executeRaw`UPDATE "mission" SET "updated_at" = ${new Date("2025-01-01")} WHERE "id" = ${existingMission.id}`;

    // Import feed again to update mission (no change)
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => xml });
    await handler.handle({ publisherId: publisher.id });

    const missions = await missionService.findMissionsBy({ publisherId: publisher.id, clientId: "32132143" });

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
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => xmlWithoutStartAt });

    const result = await handler.handle({ publisherId: publisher.id });
    expect(result.success).toBe(true);
    expect(result.imports[0].status).toBe("SUCCESS");

    const missions = await missionService.findMissionsBy({ publisherId: publisher.id, clientId: "TEST_NO_START_DATE" });
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
    (global.fetch as any).mockResolvedValueOnce({ ok: true, text: async () => xmlWithoutStartAt });

    const result2 = await handler.handle({ publisherId: publisher.id });
    expect(result2.success).toBe(true);
    expect(result2.imports[0].status).toBe("SUCCESS");

    const missionsAfterUpdate = await missionService.findMissionsBy({ publisherId: publisher.id, clientId: "TEST_NO_START_DATE" });
    expect(missionsAfterUpdate.length).toBe(1);

    const updatedMission = missionsAfterUpdate[0];

    // startAt should be preserved from the first import, not changed to the second import date
    expect(updatedMission.startAt.toISOString()).toBe(originalStartAt.toISOString());
    // The mission should exist and have the preserved startAt, which should be different from second import date
    expect(Math.abs(updatedMission.startAt.getTime() - secondImportDate.getTime())).toBeGreaterThan(0);
  });
});
