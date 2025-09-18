import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { v4 as uuidv4 } from "uuid";
import type { Client as ElasticsearchClient } from "@elastic/elasticsearch";
import type { PrismaClient as PrismaClientCore } from "../../../src/db/core";
import { createTestMission, createTestPublisher } from "../../fixtures";
import type { Stats } from "../../../src/types";
import { createTestApp } from "../../testApp";

// Requires docker-compose.test.yml to be running
describe("RedirectController /r/apply integration with docker-compose services", () => {
  let prismaCore: PrismaClientCore;
  let esClient: ElasticsearchClient;
  let statsIndex: string;
  let statEventRepository: typeof import("../../../src/repositories/stat-event");
  const app = createTestApp();

  const previousReadStatsFrom = process.env.READ_STATS_FROM;
  const previousWriteStatsDual = process.env.WRITE_STATS_DUAL;

  beforeAll(async () => {
    process.env.READ_STATS_FROM = "pg";
    process.env.WRITE_STATS_DUAL = "true";

    const [postgresModule, elasticModule, configModule, statEventModule] = await Promise.all([
      import("../../../src/db/postgres"),
      import("../../../src/db/elastic"),
      import("../../../src/config"),
      import("../../../src/repositories/stat-event"),
    ]);

    await Promise.all([postgresModule.pgConnected, elasticModule.esConnected]);

    prismaCore = postgresModule.prismaCore;
    esClient = elasticModule.default;
    statsIndex = configModule.STATS_INDEX;
    statEventRepository = statEventModule;
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
        index: statsIndex,
        body: { query: { match_all: {} } },
        refresh: true,
      });
    } catch (error: any) {
      if (error?.meta?.statusCode !== 404) {
        throw error;
      }
    }

    try {
      await esClient.indices.refresh({ index: statsIndex });
    } catch (error: any) {
      if (error?.meta?.statusCode !== 404) {
        throw error;
      }
    }
  });

  it(
    "creates an apply stat event persisted in PostgreSQL and Elasticsearch",
    async () => {
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
        missionOrganizationId: mission.organizationId,
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

      await esClient.indices.refresh({ index: statsIndex });
      const esResult = await esClient.get({ index: statsIndex, id: createdId });
      expect(esResult.body._source.type).toBe("apply");
      expect(esResult.body._source.missionClientId).toBe(mission.clientId);
    },
    120000,
  );
});
