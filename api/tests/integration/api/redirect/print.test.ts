import { Types } from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STATS_INDEX } from "../../../../src/config";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../../../../src/error";
import MissionModel from "../../../../src/models/mission";
import PublisherModel from "../../../../src/models/publisher";
import StatsBotModel from "../../../../src/models/stats-bot";
import WidgetModel from "../../../../src/models/widget";
import * as utils from "../../../../src/utils";
import { elasticMock } from "../../../mocks";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /impression/:missionId/:publisherId", () => {
  beforeEach(async () => {
    await MissionModel.deleteMany({});
    await PublisherModel.deleteMany({});
    await WidgetModel.deleteMany({});

    elasticMock.index.mockReset();
    elasticMock.index.mockResolvedValue({ body: { _id: "default-print-id" } });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await MissionModel.deleteMany({});
    await PublisherModel.deleteMany({});
    await WidgetModel.deleteMany({});
  });

  it("returns 204 when identity is missing", async () => {
    vi.spyOn(utils, "identify").mockReturnValue(null);

    const response = await request(app).get(`/r/impression/${new Types.ObjectId().toString()}/${new Types.ObjectId().toString()}`);

    expect(response.status).toBe(204);
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("returns 400 when params are invalid", async () => {
    const identity = { user: "user", referer: "https://ref", userAgent: "Mozilla" };
    vi.spyOn(utils, "identify").mockReturnValue(identity);

    const response = await request(app).get(`/r/impression/${new Types.ObjectId().toString()}/invalid`);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ ok: false, code: INVALID_PARAMS });
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("returns 400 when query is invalid", async () => {
    const identity = { user: "user", referer: "https://ref", userAgent: "Mozilla" };
    vi.spyOn(utils, "identify").mockReturnValue(identity);

    const mission = await MissionModel.create({
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: new Types.ObjectId().toString(),
      publisherName: "Mission Publisher",
      title: "Mission Title",
    });

    const publisher = await PublisherModel.create({
      name: "From Publisher",
    });

    const response = await request(app)
      .get(`/r/impression/${mission._id.toString()}/${publisher._id.toString()}`)
      .query({ sourceId: "not-a-valid-object-id" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ ok: false, code: INVALID_QUERY });
  });

  it("returns 404 when mission is not found", async () => {
    const identity = { user: "user", referer: "https://ref", userAgent: "Mozilla" };
    vi.spyOn(utils, "identify").mockReturnValue(identity);

    const response = await request(app).get(`/r/impression/${new Types.ObjectId().toString()}/${new Types.ObjectId().toString()}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ ok: false, code: NOT_FOUND });
  });

  it("returns 404 when publisher is not found", async () => {
    const identity = { user: "user", referer: "https://ref", userAgent: "Mozilla" };
    vi.spyOn(utils, "identify").mockReturnValue(identity);

    const mission = await MissionModel.create({
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: new Types.ObjectId().toString(),
      publisherName: "Mission Publisher",
      title: "Mission Title",
    });

    const response = await request(app).get(`/r/impression/${mission._id.toString()}/${new Types.ObjectId().toString()}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ ok: false, code: NOT_FOUND });
  });

  it("records print stats with widget source when all data is present", async () => {
    const mission = await MissionModel.create({
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      domain: "mission.example.com",
      title: "Mission Title",
      postalCode: "75001",
      departmentName: "Paris",
      organizationName: "Mission Org",
      organizationId: "mission-org-id",
      organizationClientId: "mission-org-client-id",
      lastSyncAt: new Date(),
      publisherId: new Types.ObjectId().toString(),
      publisherName: "Mission Publisher",
    });

    const publisher = await PublisherModel.create({
      name: "From Publisher",
    });

    const widget = await WidgetModel.create({
      name: "Widget Name",
      fromPublisherId: new Types.ObjectId().toString(),
      fromPublisherName: "Widget Source Publisher",
    });

    const identity = {
      user: "print-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue({ user: identity.user } as any);
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "print-id" } });

    const requestId = new Types.ObjectId().toString();
    const response = await request(app)
      .get(`/r/impression/${mission._id.toString()}/${publisher._id.toString()}`)
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ tracker: "tag", sourceId: widget._id.toString(), requestId });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toMatchObject({
      _id: expect.any(String),
      type: "print",
      tag: "tag",
      source: "widget",
      sourceId: widget._id.toString(),
      sourceName: widget.name,
      missionId: mission._id.toString(),
      missionClientId: mission.clientId,
      missionDomain: mission.domain,
      missionTitle: mission.title,
      missionPostalCode: mission.postalCode,
      missionDepartmentName: mission.departmentName,
      missionOrganizationName: mission.organizationName,
      missionOrganizationId: mission.organizationId,
      missionOrganizationClientId: mission.organizationClientId,
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,
      fromPublisherId: publisher._id.toString(),
      fromPublisherName: publisher.name,
      isBot: true,
    });

    expect(elasticMock.index).toHaveBeenCalledTimes(1);
    const [indexArgs] = elasticMock.index.mock.calls;
    expect(indexArgs[0].index).toBe(STATS_INDEX);
    expect(indexArgs[0].body).toMatchObject({
      type: "print",
      host: "redirect.test",
      origin: "https://app.example.com",
      referer: identity.referer,
      userAgent: identity.userAgent,
      user: identity.user,
      requestId,
      tag: "tag",
      source: "widget",
      sourceId: widget._id.toString(),
      sourceName: widget.name,
      missionId: mission._id.toString(),
      missionClientId: mission.clientId,
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,
      fromPublisherId: publisher._id.toString(),
      fromPublisherName: publisher.name,
      isBot: true,
    });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });
  });

  it("returns 200 and records print stats when query has only tracker", async () => {
    const mission = await MissionModel.create({
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: new Types.ObjectId().toString(),
      publisherName: "Mission Publisher",
      title: "Mission Title",
    });

    const publisher = await PublisherModel.create({
      name: "From Publisher",
    });

    const identity = {
      user: "print-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    vi.spyOn(StatsBotModel, "findOne").mockResolvedValue(null);
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "print-id" } });

    const response = await request(app)
      .get(`/r/impression/${mission._id.toString()}/${publisher._id.toString()}`)
      .query({ tracker: "tag" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.source).toBe("jstag");
    expect(response.body.data.isBot).toBe(false);
    expect(response.body.data.sourceId).toBeUndefined();
  });
});
