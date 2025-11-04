import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STATS_INDEX } from "../../../../src/config";
import MissionModel from "../../../../src/models/mission";
import StatsBotModel from "../../../../src/models/stats-bot";
import * as utils from "../../../../src/utils";
import { elasticMock } from "../../../mocks";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /account", () => {
  beforeEach(async () => {
    await MissionModel.deleteMany({});

    elasticMock.index.mockReset();
    elasticMock.count.mockReset();
    elasticMock.get.mockReset();

    elasticMock.index.mockResolvedValue({ body: { _id: "default-account-id" } });
    elasticMock.count.mockResolvedValue({ body: { count: 0 } });
    elasticMock.get.mockResolvedValue({
      body: {
        _id: "default-click-id",
        _source: {},
      },
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await MissionModel.deleteMany({});
  });

  it("returns 204 when identity is missing", async () => {
    const identifySpy = vi.spyOn(utils, "identify").mockReturnValue(null);

    const response = await request(app).get("/r/account").query({ view: "click-id" });

    expect(response.status).toBe(204);
    expect(identifySpy).toHaveBeenCalled();
    expect(elasticMock.get).not.toHaveBeenCalled();
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("returns 204 when query params are invalid", async () => {
    vi.spyOn(utils, "identify").mockReturnValue({
      user: "user-id",
      referer: "https://example.com",
      userAgent: "Mozilla/5.0",
    });

    const response = await request(app).get("/r/account?view[foo]=bar");

    expect(response.status).toBe(204);
    expect(elasticMock.get).not.toHaveBeenCalled();
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("records account stats with mission details when available", async () => {
    const mission = await MissionModel.create({
      clientId: "mission-client-id",
      title: "Mission Title",
      publisherId: "mission-publisher-id",
      publisherName: "Mission Publisher",
      lastSyncAt: new Date(),
      domain: "mission-domain",
      postalCode: "75001",
      departmentName: "Paris",
      organizationName: "Mission Org",
      organizationId: "mission-org-id",
      organizationClientId: "mission-org-client-id",
    });

    const identity = {
      user: "identity-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue({ user: identity.user } as any);

    const clickStat = {
      user: "click-user",
      source: "campaign",
      sourceId: "campaign-id",
      sourceName: "Campaign Name",
      fromPublisherId: "source-publisher-id",
      fromPublisherName: "Source Publisher",
      toPublisherId: "click-publisher-id",
      toPublisherName: "Click Publisher",
      missionId: "click-mission-id",
      missionClientId: "click-mission-client-id",
      missionDomain: "click-domain",
      missionTitle: "Click Mission Title",
      missionPostalCode: "69000",
      missionDepartmentName: "Lyon",
      missionOrganizationName: "Click Org",
      missionOrganizationId: "click-org-id",
    };

    elasticMock.get.mockResolvedValueOnce({
      body: {
        _id: "click-123",
        _source: clickStat,
      },
    });
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "account-123" } });

    const response = await request(app)
      .get("/r/account")
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ view: "click-123", mission: mission.clientId, publisher: mission.publisherId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: expect.any(String) });

    expect(elasticMock.get).toHaveBeenCalledWith({ index: STATS_INDEX, id: "click-123" });
    expect(elasticMock.count).toHaveBeenCalled();
    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });

    expect(elasticMock.index).toHaveBeenCalledTimes(1);
    const [indexArgs] = elasticMock.index.mock.calls;
    expect(indexArgs[0].index).toBe(STATS_INDEX);
    expect(indexArgs[0].body).toMatchObject({
      type: "account",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      host: "redirect.test",
      origin: "https://app.example.com",
      clickUser: clickStat.user,
      clickId: "click-123",
      source: clickStat.source,
      sourceId: clickStat.sourceId,
      sourceName: clickStat.sourceName,
      fromPublisherId: clickStat.fromPublisherId,
      fromPublisherName: clickStat.fromPublisherName,
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,
      missionId: mission._id.toString(),
      missionClientId: mission.clientId,
      missionDomain: mission.domain,
      missionTitle: mission.title,
      missionPostalCode: mission.postalCode,
      missionDepartmentName: mission.departmentName,
      missionOrganizationName: mission.organizationName,
      missionOrganizationId: mission.organizationId,
      missionOrganizationClientId: mission.organizationClientId,
      isBot: true,
    });
  });

  it("records account stats with click mission data when mission is absent", async () => {
    const identity = {
      user: "another-identity-user",
      referer: "https://another-referrer.example.com",
      userAgent: "Mozilla/5.0",
    };
    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue(null);

    const clickStat = {
      user: "click-user",
      source: "publisher",
      sourceId: "source-id",
      sourceName: "Source Name",
      fromPublisherId: "source-publisher-id",
      fromPublisherName: "Source Publisher",
      toPublisherId: "to-publisher-id",
      toPublisherName: "To Publisher",
      missionId: "click-mission-id",
      missionClientId: "click-mission-client-id",
      missionDomain: "click-domain",
      missionTitle: "Click Mission Title",
      missionPostalCode: "33000",
      missionDepartmentName: "Bordeaux",
      missionOrganizationName: "Click Org",
      missionOrganizationId: "click-org-id",
    };

    elasticMock.get.mockResolvedValueOnce({
      body: {
        _id: "click-456",
        _source: clickStat,
      },
    });
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "account-456" } });

    const response = await request(app).get("/r/account").query({ view: "click-456" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: expect.any(String) });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });
    expect(elasticMock.count).toHaveBeenCalled();
    expect(elasticMock.index).toHaveBeenCalledTimes(1);
    const [accountCall] = elasticMock.index.mock.calls;
    expect(accountCall[0].index).toBe(STATS_INDEX);
    expect(accountCall[0].body).toMatchObject({
      type: "account",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      clickUser: clickStat.user,
      clickId: "click-456",
      source: clickStat.source,
      sourceId: clickStat.sourceId,
      sourceName: clickStat.sourceName,
      fromPublisherId: clickStat.fromPublisherId,
      fromPublisherName: clickStat.fromPublisherName,
      toPublisherId: clickStat.toPublisherId,
      toPublisherName: clickStat.toPublisherName,
      missionId: clickStat.missionId,
      missionClientId: clickStat.missionClientId,
      missionTitle: clickStat.missionTitle,
      missionDomain: clickStat.missionDomain,
      missionOrganizationName: clickStat.missionOrganizationName,
      missionOrganizationId: clickStat.missionOrganizationId,
      missionPostalCode: clickStat.missionPostalCode,
      missionDepartmentName: clickStat.missionDepartmentName,
      isBot: false,
    });
  });
});
