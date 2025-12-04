import { Types } from "mongoose";
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
      expect(response.body).toEqual({ ok: false, code: "NOT_FOUND" });
    });
  });

  describe("POST /v2/activity/:missionId/apply", () => {
    it("records apply events using the stat-event repository", async () => {
      const missionPublisherId = new Types.ObjectId().toString();
      const mission = await createTestMission({
        clientId: "apply-mission-client",
        title: "Apply Mission",
        publisherId: missionPublisherId,
        publisherName: "Apply Mission Publisher",
        lastSyncAt: new Date(),
        statusCode: "ACCEPTED",
      });

      const publisher = await publisherService.createPublisher({ name: "Apply Publisher", apikey: "apply-key" });

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

      const createdApply = await statEventService.findOneStatEventById(response.body.data._id);
      expect(createdApply).toMatchObject({
        type: "apply",
        clickId: clickStat._id,
        fromPublisherId: publisher.id,
        toPublisherId: mission.publisherId,
      });
    });
  });

  describe("PUT /v2/activity/:activityId", () => {
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
  });
});
