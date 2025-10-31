import request from "supertest";
import { Types } from "mongoose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import MissionModel from "../../../src/models/mission";
import type { Stats } from "../../../src/types";
import { publisherService } from "../../../src/services/publisher";
import { elasticMock, pgMock } from "../../mocks";
import { resetPublisherStore } from "../../mocks/publisherServiceMock";
import { createTestApp } from "../../testApp";

const app = createTestApp();

describe("Activity V2 controller", () => {
  beforeEach(() => {
    resetPublisherStore();
    elasticMock.index.mockReset();
    elasticMock.update.mockReset();
    elasticMock.get.mockReset();
    elasticMock.search.mockReset();

    pgMock.statEvent.create.mockReset();
    pgMock.statEvent.update.mockReset();
    pgMock.statEvent.findUnique.mockReset();
    pgMock.statEvent.updateMany.mockReset();

    elasticMock.index.mockResolvedValue({ body: {} });
    elasticMock.update.mockResolvedValue({ body: {} });
    elasticMock.get.mockResolvedValue({
      body: {
        _id: "stat-123",
        _source: { type: "click" },
      },
    });
    elasticMock.search.mockResolvedValue({
      body: { hits: { total: { value: 0 }, hits: [] } },
    });

    pgMock.statEvent.create.mockResolvedValue({});
    pgMock.statEvent.update.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.WRITE_STATS_DUAL;
    delete process.env.READ_STATS_FROM;
    resetPublisherStore();
  });

  describe("GET /v2/activity/:id", () => {
    it("returns the stat event when it exists", async () => {
      const publisher = await publisherService.createPublisher({ name: "Test Publisher", apikey: "get-activity-key" });

      const stat: Partial<Stats> = {
        type: "click",
        missionId: "mission-123",
        fromPublisherId: "from-123",
      };

      elasticMock.get.mockResolvedValueOnce({
        body: {
          _id: "activity-123",
          _source: stat,
        },
      });

      const response = await request(app)
        .get("/v2/activity/activity-123")
        .set("apikey", publisher.apikey || "");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true, data: { _id: "activity-123", ...stat } });
      expect(elasticMock.get).toHaveBeenCalledWith({ index: expect.any(String), id: "activity-123" });
    });

    it("returns 404 when the stat event does not exist", async () => {
      await publisherService.createPublisher({ name: "Missing Stat Publisher", apikey: "missing-activity-key" });

      elasticMock.get.mockRejectedValueOnce({ statusCode: 404 });

      const response = await request(app)
        .get("/v2/activity/unknown-activity")
        .set("apikey", "missing-activity-key");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ ok: false, code: "NOT_FOUND" });
    });
  });

  describe("POST /v2/activity/:missionId/:publisherId/click", () => {
    it("writes click events to Elasticsearch and Postgres when dual write is enabled", async () => {
      process.env.WRITE_STATS_DUAL = "true";

      const missionPublisherId = new Types.ObjectId().toString();
      const mission = await MissionModel.create({
        clientId: "mission-client-id",
        title: "Click Mission",
        publisherId: missionPublisherId,
        publisherName: "Mission Publisher",
        lastSyncAt: new Date(),
        statusCode: "ACCEPTED",
      });

      const publisher = await publisherService.createPublisher({ name: "Click Publisher", apikey: "click-key" });

      const response = await request(app)
        .post(`/v2/activity/${mission._id.toString()}/${publisher.id}/click`)
        .set("Host", "click.test")
        .set("Origin", "https://app.test")
        .set("Referer", "https://referer.test");

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toMatchObject({ type: "click", missionId: mission._id.toString() });

      expect(elasticMock.index).toHaveBeenCalledTimes(1);
      const [indexArgs] = elasticMock.index.mock.calls;
      expect(indexArgs[0].body).toMatchObject({
        type: "click",
        missionId: mission._id.toString(),
        fromPublisherId: publisher.id,
        toPublisherId: mission.publisherId,
      });

      expect(pgMock.statEvent.create).toHaveBeenCalledTimes(1);
      expect(pgMock.statEvent.create.mock.calls[0][0].data).toMatchObject({ type: "click" });
    });
  });

  describe("POST /v2/activity/:missionId/apply", () => {
    it("records apply events using the stat-event repository", async () => {
      process.env.WRITE_STATS_DUAL = "true";

      const missionPublisherId = new Types.ObjectId().toString();
      const mission = await MissionModel.create({
        clientId: "apply-mission-client",
        title: "Apply Mission",
        publisherId: missionPublisherId,
        publisherName: "Apply Mission Publisher",
        lastSyncAt: new Date(),
        statusCode: "ACCEPTED",
      });

      const publisher = await publisherService.createPublisher({ name: "Apply Publisher", apikey: "apply-key" });

      const clickStat: Stats = {
        _id: "click-apply",
        type: "click",
        createdAt: new Date(),
        missionId: mission._id.toString(),
        missionClientId: mission.clientId,
        missionDomain: "mission-domain",
        missionTitle: mission.title,
        missionPostalCode: "75001",
        missionDepartmentName: "Paris",
        missionOrganizationName: "Mission Org",
        missionOrganizationId: "mission-org-id",
        missionOrganizationClientId: "mission-org-client-id",
        toPublisherId: mission.publisherId,
        toPublisherName: mission.publisherName,
        fromPublisherId: "click-from",
        fromPublisherName: "Click From",
        tag: "existing-tag",
        host: "host.test",
        origin: "https://origin.test",
        referer: "https://referer.test",
        source: "publisher",
        sourceName: "Click Source",
        sourceId: "click-source-id",
      } as Stats;

      elasticMock.get.mockResolvedValueOnce({
        body: {
          _id: clickStat._id,
          _source: clickStat,
        },
      });

      const response = await request(app)
        .post(`/v2/activity/${mission._id.toString()}/apply`)
        .set("apikey", publisher.apikey ?? "")
        .set("Host", "apply.test")
        .set("Origin", "https://app.test")
        .set("Referer", "https://referer.test")
        .query({ clickId: clickStat._id, tag: "new-tag" });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toMatchObject({ type: "apply", clickId: clickStat._id, tag: "new-tag" });

      expect(elasticMock.index).toHaveBeenCalledTimes(1);
      const [applyIndexArgs] = elasticMock.index.mock.calls;
      expect(applyIndexArgs[0].body).toMatchObject({
        type: "apply",
        clickId: clickStat._id,
        fromPublisherId: publisher.id,
        toPublisherId: mission.publisherId,
      });

      expect(pgMock.statEvent.create).toHaveBeenCalledTimes(1);
      expect(pgMock.statEvent.create.mock.calls[0][0].data).toMatchObject({ type: "apply" });
    });
  });

  describe("PUT /v2/activity/:activityId", () => {
    it("updates the activity status using the repository", async () => {
      process.env.WRITE_STATS_DUAL = "true";

      const publisher = await publisherService.createPublisher({ name: "Update Publisher", apikey: "update-key" });

      const statEvent: Stats = {
        _id: "activity-update",
        type: "apply",
        status: "PENDING",
        createdAt: new Date(),
        missionId: "mission-update",
        toPublisherId: "to-publisher",
        toPublisherName: "To Publisher",
        fromPublisherId: "from-publisher",
        fromPublisherName: "From Publisher",
      } as Stats;

      elasticMock.get.mockResolvedValueOnce({
        body: {
          _id: statEvent._id,
          _source: statEvent,
        },
      });

      const response = await request(app)
        .put(`/v2/activity/${statEvent._id}`)
        .set("apikey", "update-key")
        .send({ status: "VALIDATED" });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ _id: statEvent._id, status: "VALIDATED" });

      expect(elasticMock.update).toHaveBeenCalledWith({
        index: expect.any(String),
        id: statEvent._id,
        body: { doc: { status: "VALIDATED" } },
        retry_on_conflict: undefined,
      });

      expect(pgMock.statEvent.update).toHaveBeenCalledTimes(1);
      expect(pgMock.statEvent.update.mock.calls[0][0]).toMatchObject({ where: { id: statEvent._id } });
    });
  });
});
