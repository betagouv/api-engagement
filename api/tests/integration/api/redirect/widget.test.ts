import { Types } from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JVA_URL, PUBLISHER_IDS, STATS_INDEX } from "../../../../src/config";
import MissionModel from "../../../../src/models/mission";
import StatsBotModel from "../../../../src/models/stats-bot";
import WidgetModel from "../../../../src/models/widget";
import * as utils from "../../../../src/utils";
import { elasticMock } from "../../../mocks";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /widget/:id", () => {
  beforeEach(async () => {
    await MissionModel.deleteMany({});
    await WidgetModel.deleteMany({});

    elasticMock.index.mockReset();
    elasticMock.update.mockReset();

    elasticMock.index.mockResolvedValue({ body: { _id: "default-widget-click" } });
    elasticMock.update.mockResolvedValue({});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await MissionModel.deleteMany({});
    await WidgetModel.deleteMany({});
  });

  it("redirects to JVA when mission is not found and identity is missing", async () => {
    vi.spyOn(utils, "identify").mockReturnValue(null);

    const missionId = new Types.ObjectId().toString();
    const response = await request(app).get(`/r/widget/${missionId}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(JVA_URL);
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("redirects to mission application URL when identity is missing but mission exists", async () => {
    const mission = await MissionModel.create({
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: new Types.ObjectId().toString(),
      publisherName: "Mission Publisher",
      title: "Mission Title",
    });

    vi.spyOn(utils, "identify").mockReturnValue(null);

    const response = await request(app).get(`/r/widget/${mission._id.toString()}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://mission.example.com/apply");
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("records click stats and appends tracking parameters when widget and identity are present", async () => {
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

    const widget = await WidgetModel.create({
      name: "Widget Name",
      fromPublisherId: new Types.ObjectId().toString(),
      fromPublisherName: "From Publisher",
    });

    const identity = {
      user: "widget-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue({ user: identity.user } as any);
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "widget-click-id" } });

    const requestId = new Types.ObjectId().toString();
    const response = await request(app)
      .get(`/r/widget/${mission._id.toString()}`)
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ widgetId: widget._id.toString(), requestId });

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
    expect(redirectUrl.searchParams.get("apiengagement_id")).toBe("widget-click-id");
    expect(redirectUrl.searchParams.get("utm_source")).toBe("api_engagement");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("widget");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("widget-name");

    expect(elasticMock.index).toHaveBeenCalledWith({
      index: STATS_INDEX,
      body: expect.objectContaining({
        type: "click",
        user: identity.user,
        referer: identity.referer,
        userAgent: identity.userAgent,
        host: "redirect.test",
        origin: "https://app.example.com",
        requestId,
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
        fromPublisherId: widget.fromPublisherId,
        fromPublisherName: widget.fromPublisherName,
        isBot: false,
      }),
    });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });
    expect(elasticMock.update).toHaveBeenCalledWith({
      index: STATS_INDEX,
      id: "widget-click-id",
      body: { doc: { isBot: true } },
    });
  });

  it("uses mtm tracking parameters when mission publisher is service civique", async () => {
    const originalServicePublisherId = PUBLISHER_IDS.SERVICE_CIVIQUE;
    const servicePublisherId = originalServicePublisherId || new Types.ObjectId().toString();
    if (!originalServicePublisherId) {
      PUBLISHER_IDS.SERVICE_CIVIQUE = servicePublisherId;
    }

    try {
      const mission = await MissionModel.create({
        applicationUrl: "https://mission.example.com/apply",
        clientId: "mission-client-id",
        lastSyncAt: new Date(),
        publisherId: servicePublisherId,
        publisherName: "Service Civique",
        title: "Mission Title",
      });

      const widget = await WidgetModel.create({
        name: "Widget Special",
        fromPublisherId: new Types.ObjectId().toString(),
        fromPublisherName: "From Publisher",
      });

      const identity = {
        user: "widget-user",
        referer: "https://referrer.example.com",
        userAgent: "Mozilla/5.0",
      };

      vi.spyOn(utils, "identify").mockReturnValue(identity);
      vi.spyOn(StatsBotModel, "findOne").mockResolvedValue(null);
      elasticMock.index.mockResolvedValueOnce({ body: { _id: "widget-click-id" } });

      const response = await request(app)
        .get(`/r/widget/${mission._id.toString()}`)
        .query({ widgetId: widget._id.toString() });

      expect(response.status).toBe(302);
      const redirectUrl = new URL(response.headers.location);
      expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
      expect(redirectUrl.searchParams.get("apiengagement_id")).toBe("widget-click-id");
      expect(redirectUrl.searchParams.get("mtm_source")).toBe("api_engagement");
      expect(redirectUrl.searchParams.get("mtm_medium")).toBe("widget");
      expect(redirectUrl.searchParams.get("mtm_campaign")).toBe("widget-special");
    } finally {
      if (!originalServicePublisherId) {
        PUBLISHER_IDS.SERVICE_CIVIQUE = originalServicePublisherId;
      }
    }
  });
});
