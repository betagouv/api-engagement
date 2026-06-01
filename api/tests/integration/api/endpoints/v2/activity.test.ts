import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "@/db/postgres";
import { publisherService } from "@/services/publisher";
import { statEventService } from "@/services/stat-event";
import { createTestMission } from "../../../../fixtures";
import { createClickStat, createStatEventFixture } from "../../../../fixtures/stat-event";
import { createTestApp } from "../../../../testApp";

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
        missionId: mission.id,
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
        missionId: mission.id,
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

    it("records apply events without clickId using missionClientId for the authenticated publisher", async () => {
      const publisher = await publisherService.createPublisher({ name: "Apply Publisher Mission Client", apikey: "apply-mission-client-key" });
      const mission = await createTestMission({
        clientId: "direct-apply-mission-client",
        title: "Direct Apply Mission Client",
        publisherId: publisher.id,
        statusCode: "ACCEPTED",
      });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", publisher.apikey || "")
        .send({ missionClientId: mission.clientId, tag: "owner-tag" });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toMatchObject({ type: "apply", tag: "owner-tag", missionId: mission.id });

      const createdApply = await statEventService.findOneStatEventById(response.body.data._id);
      expect(createdApply).toMatchObject({
        type: "apply",
        fromPublisherId: publisher.id,
        toPublisherId: publisher.id,
        missionId: mission.id,
      });
      expect(createdApply?.clickId).toBeNull();
    });

    it("records apply events without clickId using missionId when diffusion rules allow the mission", async () => {
      const owner = await publisherService.createPublisher({ name: "Mission Owner Publisher", apikey: "mission-owner-key" });
      const diffuser = await publisherService.createPublisher({ name: "Allowed Diffuser Publisher", apikey: "allowed-diffuser-key" });
      const mission = await createTestMission({
        clientId: "allowed-diffusion-mission",
        title: "Allowed Diffusion Mission",
        publisherId: owner.id,
        statusCode: "ACCEPTED",
      });

      await prisma.publisherDiffusionRule.create({
        data: {
          publisherId: diffuser.id,
          field: "publisherId",
          fieldType: "string",
          operator: "is",
          value: owner.id,
          combinator: "or",
        },
      });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", diffuser.apikey || "")
        .send({ missionId: mission.id, tag: "MIG" });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toMatchObject({ type: "apply", tag: "MIG", missionId: mission.id });

      const createdApply = await statEventService.findOneStatEventById(response.body.data._id);
      expect(createdApply).toMatchObject({
        type: "apply",
        fromPublisherId: diffuser.id,
        toPublisherId: owner.id,
        missionId: mission.id,
      });
      expect(createdApply?.clickId).toBeNull();
    });

    it("records apply events without clickId using missionId when the diffuser has no rules", async () => {
      const owner = await publisherService.createPublisher({ name: "No Rules Mission Owner", apikey: "no-rules-owner-key" });
      const diffuser = await publisherService.createPublisher({ name: "No Rules Diffuser", apikey: "no-rules-diffuser-key" });
      const mission = await createTestMission({
        clientId: "no-rules-mission",
        title: "No Rules Mission",
        publisherId: owner.id,
        statusCode: "ACCEPTED",
      });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", diffuser.apikey || "")
        .send({ missionId: mission.id, tag: "MIG" });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      const createdApply = await statEventService.findOneStatEventById(response.body.data._id);
      expect(createdApply).toMatchObject({
        type: "apply",
        fromPublisherId: diffuser.id,
        toPublisherId: owner.id,
        missionId: mission.id,
      });
    });

    it("returns 403 when missionId is outside the publisher diffusion rules", async () => {
      const allowedOwner = await publisherService.createPublisher({ name: "Allowed Owner", apikey: "allowed-owner-key" });
      const otherOwner = await publisherService.createPublisher({ name: "Other Owner", apikey: "other-owner-key" });
      const diffuser = await publisherService.createPublisher({ name: "Restricted Diffuser", apikey: "restricted-diffuser-key" });
      const mission = await createTestMission({
        clientId: "outside-rules-mission",
        title: "Outside Rules Mission",
        publisherId: otherOwner.id,
        statusCode: "ACCEPTED",
      });

      await prisma.publisherDiffusionRule.create({
        data: {
          publisherId: diffuser.id,
          field: "publisherId",
          fieldType: "string",
          operator: "is",
          value: allowedOwner.id,
          combinator: "or",
        },
      });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", diffuser.apikey || "")
        .send({ missionId: mission.id, tag: "MIG" });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ ok: false, code: "FORBIDDEN", message: "Mission not accessible" });
    });

    it("returns 403 when the diffuser has rules that cannot be applied", async () => {
      const owner = await publisherService.createPublisher({ name: "Invalid Rule Mission Owner", apikey: "invalid-rule-owner-key" });
      const diffuser = await publisherService.createPublisher({ name: "Invalid Rule Diffuser", apikey: "invalid-rule-diffuser-key" });
      const mission = await createTestMission({
        clientId: "invalid-rule-mission",
        title: "Invalid Rule Mission",
        publisherId: owner.id,
        statusCode: "ACCEPTED",
      });

      await prisma.publisherDiffusionRule.create({
        data: {
          publisherId: diffuser.id,
          field: "unknownField",
          fieldType: "string",
          operator: "is",
          value: owner.id,
          combinator: "or",
        },
      });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", diffuser.apikey || "")
        .send({ missionId: mission.id, tag: "MIG" });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ ok: false, code: "FORBIDDEN", message: "Mission not accessible" });
    });

    it("returns 404 when missionId targets a deleted or non accepted mission", async () => {
      const owner = await publisherService.createPublisher({ name: "Unavailable Mission Owner", apikey: "unavailable-owner-key" });
      const diffuser = await publisherService.createPublisher({ name: "Unavailable Mission Diffuser", apikey: "unavailable-diffuser-key" });
      const refusedMission = await createTestMission({
        clientId: "refused-direct-apply-mission",
        title: "Refused Direct Apply Mission",
        publisherId: owner.id,
        statusCode: "REFUSED",
      });
      const deletedMission = await createTestMission({
        clientId: "deleted-direct-apply-mission",
        title: "Deleted Direct Apply Mission",
        publisherId: owner.id,
        statusCode: "ACCEPTED",
        deleted: true,
      });

      const refusedResponse = await request(app)
        .post("/v2/activity/")
        .set("apikey", diffuser.apikey || "")
        .send({ missionId: refusedMission.id });
      const deletedResponse = await request(app)
        .post("/v2/activity/")
        .set("apikey", diffuser.apikey || "")
        .send({ missionId: deletedMission.id });

      expect(refusedResponse.status).toBe(404);
      expect(refusedResponse.body).toEqual({ ok: false, code: "NOT_FOUND", message: "Mission not found" });
      expect(deletedResponse.status).toBe(404);
      expect(deletedResponse.body).toEqual({ ok: false, code: "NOT_FOUND", message: "Mission not found" });
    });

    it("returns 400 when no clickId, missionId or missionClientId is provided", async () => {
      const publisher = await publisherService.createPublisher({ name: "Apply Publisher Missing Link", apikey: "apply-missing-link-key" });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", publisher.apikey || "")
        .send({ tag: "missing-link" });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_BODY");
    });

    it("returns 400 when missionId and missionClientId are provided without clickId", async () => {
      const publisher = await publisherService.createPublisher({ name: "Apply Publisher Ambiguous Mission", apikey: "apply-ambiguous-mission-key" });

      const response = await request(app)
        .post("/v2/activity/")
        .set("apikey", publisher.apikey || "")
        .send({ missionId: "mission-id", missionClientId: "mission-client-id" });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_BODY");
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
