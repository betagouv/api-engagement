import request from "supertest";
import { describe, expect, it } from "vitest";

import { publisherService } from "../../../../src/services/publisher";
import { statEventService } from "../../../../src/services/stat-event";
import { createTestMission } from "../../../fixtures";
import { createClickStat, createStatEventFixture } from "../../../fixtures/stat-event";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Activity V2 controller", () => {
  describe("GET /v2/activity/:id", () => {
    it("returns the stat event when it exists", async () => {
      const publisher = await publisherService.createPublisher({ name: "Test Publisher", apikey: "get-activity-key" });

      const stat = await createStatEventFixture({
        type: "click",
        missionId: "mission-123",
        fromPublisherId: "from-123",
      });

      const response = await request(app)
        .get(`/v2/activity/${stat._id}`)
        .set("apikey", publisher.apikey || "");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ ok: true, data: { _id: stat._id } });
    });

    it("returns 404 when the stat event does not exist", async () => {
      await publisherService.createPublisher({ name: "Missing Stat Publisher", apikey: "missing-activity-key" });

      const response = await request(app).get("/v2/activity/unknown-activity").set("apikey", "missing-activity-key");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ ok: false, code: "NOT_FOUND", message: "Activity not found" });
    });

    it("returns the stat event when the clientEventId matches", async () => {
      const publisher = await publisherService.createPublisher({ name: "ClientEvent Publisher", apikey: "client-event-key" });

      const stat = await createStatEventFixture({
        type: "apply",
        clientEventId: "client-event-apply",
        toPublisherId: publisher.id,
      });

      const response = await request(app)
        .get("/v2/activity/client-event-apply")
        .set("apikey", publisher.apikey || "");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ ok: true, data: { _id: stat._id } });
    });

    it("returns 409 when clientEventId is ambiguous without type", async () => {
      const publisher = await publisherService.createPublisher({ name: "Ambiguous Publisher", apikey: "ambiguous-key" });

      await createStatEventFixture({
        type: "apply",
        clientEventId: "client-event-ambiguous",
        toPublisherId: publisher.id,
      });

      await createStatEventFixture({
        type: "account",
        clientEventId: "client-event-ambiguous",
        toPublisherId: publisher.id,
      });

      const response = await request(app)
        .get("/v2/activity/client-event-ambiguous")
        .set("apikey", publisher.apikey || "");

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ ok: false, code: "INVALID_PARAMS", message: "Ambiguous clientEventId, provide type" });
    });

    it("returns the stat event when clientEventId is filtered by type", async () => {
      const publisher = await publisherService.createPublisher({ name: "ClientEvent Type Publisher", apikey: "client-event-type-key" });

      const stat = await createStatEventFixture({
        type: "apply",
        clientEventId: "client-event-type",
        toPublisherId: publisher.id,
      });

      await createStatEventFixture({
        type: "account",
        clientEventId: "client-event-type",
        toPublisherId: publisher.id,
      });

      const response = await request(app)
        .get("/v2/activity/client-event-type")
        .query({ type: "apply" })
        .set("apikey", publisher.apikey || "");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ ok: true, data: { _id: stat._id } });
    });
  });

  describe("POST /v2/activity/", () => {
    it("records apply events using the stat-event repository", async () => {
      const publisher = await publisherService.createPublisher({ name: "Apply Publisher", apikey: "apply-key" });

      const mission = await createTestMission({
        clientId: "apply-mission-client",
        title: "Apply Mission",
        publisherId: publisher.id,
        lastSyncAt: new Date(),
        statusCode: "ACCEPTED",
      });

      const clickStat = await createClickStat("click-apply", {
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
        toPublisherName: mission.publisherName || undefined,
        fromPublisherId: "click-from",
        fromPublisherName: "Click From",
        tag: "existing-tag",
        host: "host.test",
        origin: "https://origin.test",
        referer: "https://referer.test",
        source: "publisher",
        sourceName: "Click Source",
        sourceId: "click-source-id",
      });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", publisher.apikey || "")
        .set("Host", "apply.test")
        .set("Origin", "https://app.test")
        .set("Referer", "https://referer.test")
        .send({ clickId: clickStat._id, tag: "new-tag", missionClientId: mission.clientId });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toMatchObject({ type: "apply", clickId: clickStat._id, tag: "new-tag" });

      const createdApply = await statEventService.findOneStatEventById(response.body.data._id);
      expect(createdApply).toMatchObject({
        type: "apply",
        clickId: clickStat._id,
        fromPublisherId: clickStat.fromPublisherId,
        toPublisherId: publisher.id,
        missionId: mission._id.toString(),
        missionClientId: mission.clientId,
      });
    });

    it("records apply events without mission when missionClientId is not provided", async () => {
      const publisher = await publisherService.createPublisher({ name: "Apply Publisher No Mission", apikey: "apply-no-mission-key" });

      const clickStat = await createClickStat("click-apply-no-mission", {
        fromPublisherId: "click-from-no-mission",
        fromPublisherName: "Click From No Mission",
        tag: "existing-tag",
        host: "host.test",
        origin: "https://origin.test",
        referer: "https://referer.test",
      });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", publisher.apikey || "")
        .set("Host", "apply.test")
        .set("Origin", "https://app.test")
        .set("Referer", "https://referer.test")
        .send({ clickId: clickStat._id, tag: "new-tag" });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toMatchObject({ type: "apply", clickId: clickStat._id, tag: "new-tag" });

      const createdApply = await statEventService.findOneStatEventById(response.body.data._id);
      expect(createdApply).toMatchObject({
        type: "apply",
        clickId: clickStat._id,
        fromPublisherId: clickStat.fromPublisherId,
        toPublisherId: publisher.id,
      });
      expect(createdApply?.missionId).toBeNull();
    });

    it("returns 404 when clickId does not exist", async () => {
      const publisher = await publisherService.createPublisher({ name: "Apply Publisher Missing Click", apikey: "apply-missing-click-key" });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", publisher.apikey || "")
        .send({ clickId: "unknown-click-id" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ ok: false, code: "NOT_FOUND", message: "Click not found" });
    });

    it("returns 404 when missionClientId is provided but mission does not exist", async () => {
      const publisher = await publisherService.createPublisher({ name: "Apply Publisher Missing Mission", apikey: "apply-missing-mission-key" });

      const clickStat = await createClickStat("click-missing-mission", {
        fromPublisherId: "click-from-missing-mission",
      });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", publisher.apikey || "")
        .send({ clickId: clickStat._id, missionClientId: "unknown-mission-client-id" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ ok: false, code: "NOT_FOUND", message: "Mission not found" });
    });
  });

  describe("PUT /v2/activity/:id", () => {
    it("updates the activity status using the repository", async () => {
      const publisher = await publisherService.createPublisher({ name: "Update Publisher", apikey: "update-key" });

      const statEvent = await createStatEventFixture({
        _id: "activity-update",
        type: "apply",
        status: "PENDING",
        missionId: "mission-update",
        toPublisherId: "to-publisher",
        toPublisherName: "To Publisher",
        fromPublisherId: "from-publisher",
        fromPublisherName: "From Publisher",
      });

      const response = await request(app).put(`/v2/activity/${statEvent._id}`).set("apikey", "update-key").send({ status: "VALIDATED" });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ _id: statEvent._id, status: "VALIDATED" });
      const updated = await statEventService.findOneStatEventById(statEvent._id);
      expect(updated?.status).toBe("VALIDATED");
    });

    it("updates the activity status using clientEventId when provided", async () => {
      const publisher = await publisherService.createPublisher({ name: "Update ClientEvent Publisher", apikey: "update-client-event-key" });

      const statEvent = await createStatEventFixture({
        _id: "activity-client-event",
        type: "apply",
        status: "PENDING",
        clientEventId: "client-event-update",
        toPublisherId: publisher.id,
        toPublisherName: "To Publisher",
        fromPublisherId: "from-publisher",
        fromPublisherName: "From Publisher",
      });

      const response = await request(app)
        .put("/v2/activity/client-event-update")
        .set("apikey", publisher.apikey || "")
        .send({ status: "VALIDATED", type: "apply" });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ _id: statEvent._id, status: "VALIDATED" });
      const updated = await statEventService.findOneStatEventById(statEvent._id);
      expect(updated?.status).toBe("VALIDATED");
    });
  });
});
