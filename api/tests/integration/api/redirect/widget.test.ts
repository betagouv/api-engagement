import { Types } from "mongoose";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JVA_URL, PUBLISHER_IDS } from "../../../../src/config";
import { prismaCore } from "../../../../src/db/postgres";
import MissionModel from "../../../../src/models/mission";
import { statBotService } from "../../../../src/services/stat-bot";
import { widgetService } from "../../../../src/services/widget";
import * as utils from "../../../../src/utils";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /widget/:id", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("redirects to JVA when mission is not found and identity is missing", async () => {
    vi.spyOn(utils, "identify").mockReturnValue(null);

    const missionId = new Types.ObjectId().toString();
    const response = await request(app).get(`/r/widget/${missionId}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(JVA_URL);
    expect(await prismaCore.statEvent.count()).toBe(0);
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
    expect(await prismaCore.statEvent.count()).toBe(0);
  });

  it("records click stats and appends tracking parameters when widget and identity are present", async () => {
    const missionPublisherId = new Types.ObjectId().toString();
    const widgetPublisherId = new Types.ObjectId().toString();
    await prismaCore.publisher.create({ data: { id: missionPublisherId, name: "Mission Publisher" } });
    await prismaCore.publisher.create({ data: { id: widgetPublisherId, name: "From Publisher" } });

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
      publisherId: missionPublisherId,
      publisherName: "Mission Publisher",
    });

    const widget = await widgetService.createWidget({ name: "Widget Name", fromPublisherId: widgetPublisherId });

    const identity = {
      user: "widget-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue({ user: identity.user } as any);

    const requestId = new Types.ObjectId().toString();
    const response = await request(app)
      .get(`/r/widget/${mission._id.toString()}`)
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ widgetId: widget.id, requestId });

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
    expect(redirectUrl.searchParams.get("apiengagement_id")).toEqual(expect.any(String));
    expect(redirectUrl.searchParams.get("utm_source")).toBe("api_engagement");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("widget");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("widget-name");

    const clickId = redirectUrl.searchParams.get("apiengagement_id");
    const storedClick = await prismaCore.statEvent.findUnique({ where: { id: clickId! } });
    expect(storedClick).toMatchObject({
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      host: "redirect.test",
      origin: "https://app.example.com",
      requestId,
      source: "widget",
      sourceId: widget.id,
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
      fromPublisherId: widget.fromPublisherId,
      isBot: true,
    });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith(identity.user);
  });

  it("uses mtm tracking parameters when mission publisher is Service Civique", async () => {
    const originalServicePublisherId = PUBLISHER_IDS.SERVICE_CIVIQUE;
    const servicePublisherId = originalServicePublisherId || new Types.ObjectId().toString();
    if (!originalServicePublisherId) {
      PUBLISHER_IDS.SERVICE_CIVIQUE = servicePublisherId;
    }
    await prismaCore.publisher.create({ data: { id: servicePublisherId, name: "Service Civique" } });
    const widgetPublisherId = new Types.ObjectId().toString();
    await prismaCore.publisher.create({ data: { id: widgetPublisherId, name: "From Publisher" } });

    try {
      const mission = await MissionModel.create({
        applicationUrl: "https://mission.example.com/apply",
        clientId: "mission-client-id",
        lastSyncAt: new Date(),
        publisherId: servicePublisherId,
        publisherName: "Service Civique",
        title: "Mission Title",
      });

      const widget = await widgetService.createWidget({
        name: "Widget Special",
        fromPublisherId: widgetPublisherId,
      });

      const identity = {
        user: "widget-user",
        referer: "https://referrer.example.com",
        userAgent: "Mozilla/5.0",
      };

      vi.spyOn(utils, "identify").mockReturnValue(identity);
      vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

      const response = await request(app).get(`/r/widget/${mission._id.toString()}`).query({ widgetId: widget.id });

      expect(response.status).toBe(302);
      const redirectUrl = new URL(response.headers.location);
      expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
      expect(redirectUrl.searchParams.get("apiengagement_id")).toEqual(expect.any(String));
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
