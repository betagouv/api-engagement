import type express from "express";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { STATS_INDEX } from "../../../../src/config";
import esClient, { esConnected } from "../../../../src/db/elastic";
import { prismaCore, pgConnected } from "../../../../src/db/postgres";
import * as statEventRepository from "../../../../src/repositories/stat-event";
import type { Stats } from "../../../../src/types";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

describe("RedirectController /r/apply", () => {
  let app!: express.Express;

  const previousReadStatsFrom = process.env.READ_STATS_FROM;
  const previousWriteStatsDual = process.env.WRITE_STATS_DUAL;

  beforeAll(async () => {
    process.env.READ_STATS_FROM = "pg";
    process.env.WRITE_STATS_DUAL = "true";

    await Promise.all([pgConnected, esConnected]);
    app = createTestApp();
  }, 120000);

  afterAll(() => {
    if (previousReadStatsFrom === undefined) {
      delete process.env.READ_STATS_FROM;
    } else {
      process.env.READ_STATS_FROM = previousReadStatsFrom;
    }

    if (previousWriteStatsDual === undefined) {
      delete process.env.WRITE_STATS_DUAL;
    } else {
      process.env.WRITE_STATS_DUAL = previousWriteStatsDual;
    }
  });

  beforeEach(async () => {
    await prismaCore.statEvent.deleteMany();

    try {
      await esClient.deleteByQuery({
        index: STATS_INDEX,
        body: { query: { match_all: {} } },
        refresh: true,
      });
    } catch (error: any) {
      if (error?.meta?.statusCode !== 404) {
        throw error;
      }
    }

    try {
      await esClient.indices.refresh({ index: STATS_INDEX });
    } catch (error: any) {
      if (error?.meta?.statusCode !== 404) {
        throw error;
      }
    }
  });

  it("creates an apply stat event persisted in PostgreSQL and Elasticsearch", async () => {
    const publisher = await createTestPublisher({ name: "Apply Test Publisher" });
    const mission = await createTestMission({
      publisherId: publisher._id?.toString() || "",
      publisherName: publisher.name,
      clientId: "mission-client-id",
      organizationClientId: "org-client-id",
      organizationName: "Test Organization",
      organizationId: "org-id",
    });

    const clickId = uuidv4();
    const clickEvent: Stats = {
      _id: clickId,
      type: "click",
      createdAt: new Date(),
      origin: "widget",
      referer: "https://publisher.example",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      host: "localhost",
      user: "user-identifier",
      isBot: false,
      isHuman: true,
      fromPublisherId: publisher._id?.toString() || "",
      fromPublisherName: publisher.name,
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,
      missionId: (mission as any)._id?.toString(),
      missionClientId: mission.clientId,
      missionDomain: mission.domain,
      missionTitle: mission.title,
      missionPostalCode: mission.postalCode,
      missionDepartmentName: mission.departmentName,
      missionOrganizationId: mission.organizationId || "",
      missionOrganizationName: mission.organizationName,
      missionOrganizationClientId: mission.organizationClientId,
      source: "publisher",
      sourceId: "publisher",
      sourceName: "publisher",
      status: "PENDING",
      tags: [],
    };

    await statEventRepository.createStatEvent(clickEvent);

    const response = await request(app)
      .get("/r/apply")
      .set("referer", "https://app.example")
      .set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0_0)")
      .set("host", "localhost")
      .set("origin", "https://localhost")
      .query({
        view: clickId,
        mission: mission.clientId,
        publisher: mission.publisherId,
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.id).toBeTruthy();

    const createdId = response.body.id;

    const stored = await prismaCore.statEvent.findUnique({ where: { id: createdId } });
    expect(stored).toBeTruthy();
    expect(stored?.type).toBe("apply");
    expect(stored?.click_id).toBe(clickId);
    expect(stored?.mission_client_id).toBe(mission.clientId);
    expect(stored?.to_publisher_id).toBe(mission.publisherId);
    expect(stored?.mission_title).toBe(mission.title);
    expect(stored?.is_bot).toBe(false);

    await esClient.indices.refresh({ index: STATS_INDEX });
    const esResult = await esClient.get({ index: STATS_INDEX, id: createdId });
    expect(esResult.body._source.type).toBe("apply");
    expect(esResult.body._source.missionClientId).toBe(mission.clientId);
  }, 120000);
});
