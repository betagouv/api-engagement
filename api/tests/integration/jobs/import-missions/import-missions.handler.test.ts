import { readFile } from "fs/promises";
import path from "path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportMissionsHandler } from "../../../../src/jobs/import-missions/handler";
import MissionModel from "../../../../src/models/mission";
import { createTestMission, createTestPublisher } from "../../../fixtures";

// Mock global fetch
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
    expect(missions[0].title).toMatch(/Sales Executive/);
    expect(missions[0].addresses.length).toBeGreaterThan(0);
    expect(missions[0].organizationName).toBe("Big ABC Corporation");
  });

  it("If feed is empty, missions related to publisher should be deleted", async () => {
    const publisher = await createTestPublisher({ feed: "https://empty-feed" });
    await createTestMission({ publisherId: publisher._id.toString(), clientId: "client-old" });
    (global.fetch as any).mockResolvedValueOnce({ text: async () => emptyXml });

    const result = await handler.handle({ publisherId: publisher._id.toString() });

    const missions = await MissionModel.find({ publisherId: publisher._id.toString(), deleted: true });
    expect(missions.length).toBeGreaterThan(0);
    expect(result.success).toBe(true);
    expect(result.imports[0].status).toBe("SUCCESS");
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
});
