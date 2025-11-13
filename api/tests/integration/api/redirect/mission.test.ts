import { Types } from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLISHER_IDS } from "../../../../src/config";
import { prismaCore } from "../../../../src/db/postgres";
import MissionModel from "../../../../src/models/mission";
import StatsBotModel from "../../../../src/models/stats-bot";
import { publisherService } from "../../../../src/services/publisher";
import * as utils from "../../../../src/utils";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /:missionId/:publisherId", () => {
  beforeEach(async () => {
    await MissionModel.deleteMany({});
    await prismaCore.statEvent.deleteMany({});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await MissionModel.deleteMany({});
    await prismaCore.statEvent.deleteMany({});
  });

  it("redirects to Service Civique when params are invalid", async () => {
    const response = await request(app).get(`/r/${new Types.ObjectId().toString()}/invalid`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://www.service-civique.gouv.fr/");
    expect(await prismaCore.statEvent.count()).toBe(0);
  });

  it("redirects to Service Civique when mission is not found and identity is missing", async () => {
    vi.spyOn(utils, "identify").mockReturnValue(null);

    const missionId = new Types.ObjectId().toString();
    const publisherId = new Types.ObjectId().toString();
    const response = await request(app).get(`/r/${missionId}/${publisherId}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://www.service-civique.gouv.fr/");
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

    const response = await request(app).get(`/r/${mission._id.toString()}/${new Types.ObjectId().toString()}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://mission.example.com/apply");
    expect(await prismaCore.statEvent.count()).toBe(0);
  });

  it("records click stats and appends tracking parameters when identity and publisher exist", async () => {
    const fromPublisher = await publisherService.createPublisher({ name: "From Publisher" });

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

    const identity = {
      user: "mission-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue({ user: identity.user } as any);

    const response = await request(app)
      .get(`/r/${mission._id.toString()}/${fromPublisher.id}`)
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ tags: "foo,bar" });

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
    const clickId = redirectUrl.searchParams.get("apiengagement_id");
    expect(clickId).toBeTruthy();
    expect(redirectUrl.searchParams.get("utm_source")).toBe("api_engagement");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("api");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("from-publisher");

    const storedClick = await prismaCore.statEvent.findUnique({ where: { id: clickId! } });
    expect(storedClick).toMatchObject({
      type: "click",
      user: identity.user,
      referer: identity.referer,
      user_agent: identity.userAgent,
      host: "redirect.test",
      origin: "https://app.example.com",
      source: "publisher",
      source_name: fromPublisher.name,
      mission_id: mission._id.toString(),
      mission_client_id: mission.clientId,
      mission_domain: mission.domain,
      mission_title: mission.title,
      mission_postal_code: mission.postalCode,
      mission_department_name: mission.departmentName,
      mission_organization_name: mission.organizationName,
      mission_organization_id: mission.organizationId,
      mission_organization_client_id: mission.organizationClientId,
      to_publisher_id: mission.publisherId,
      to_publisher_name: mission.publisherName,
      from_publisher_id: fromPublisher.id,
      from_publisher_name: fromPublisher.name,
      tags: ["foo", "bar"],
      is_bot: true,
    });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });
  });

  it("uses mtm tracking parameters for Service Civique missions", async () => {
    const fromPublisher = await publisherService.createPublisher({ name: "From Publisher" });

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

      const identity = {
        user: "mission-user",
        referer: "https://referrer.example.com",
        userAgent: "Mozilla/5.0",
      };

      vi.spyOn(utils, "identify").mockReturnValue(identity);
      vi.spyOn(StatsBotModel, "findOne").mockResolvedValue(null);

      const response = await request(app)
        .get(`/r/${mission._id.toString()}/${fromPublisher.id}`)
        .query({ tags: "foo" });

      expect(response.status).toBe(302);
      const redirectUrl = new URL(response.headers.location);
      expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
      expect(redirectUrl.searchParams.get("apiengagement_id")).toEqual(expect.any(String));
      expect(redirectUrl.searchParams.get("mtm_source")).toBe("api_engagement");
      expect(redirectUrl.searchParams.get("mtm_medium")).toBe("api");
      expect(redirectUrl.searchParams.get("mtm_campaign")).toBe("from-publisher");
    } finally {
      if (!originalServicePublisherId) {
        PUBLISHER_IDS.SERVICE_CIVIQUE = originalServicePublisherId;
      }
    }
  });
});
