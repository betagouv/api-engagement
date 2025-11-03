import { Types } from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLISHER_IDS, STATS_INDEX } from "../../../../src/config";
import MissionModel from "../../../../src/models/mission";
import StatsBotModel from "../../../../src/models/stats-bot";
import { publisherService } from "../../../../src/services/publisher";
import * as utils from "../../../../src/utils";
import { elasticMock } from "../../../mocks";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /:missionId/:publisherId", () => {
  beforeEach(async () => {
    await MissionModel.deleteMany({});

    elasticMock.index.mockReset();
    elasticMock.update.mockReset();
    elasticMock.index.mockResolvedValue({ body: { _id: "default-click-id" } });
    elasticMock.update.mockResolvedValue({});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await MissionModel.deleteMany({});
  });

  it("redirects to Service Civique when params are invalid", async () => {
    const response = await request(app).get(`/r/${new Types.ObjectId().toString()}/invalid`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://www.service-civique.gouv.fr/");
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("redirects to Service Civique when mission is not found and identity is missing", async () => {
    vi.spyOn(utils, "identify").mockReturnValue(null);

    const missionId = new Types.ObjectId().toString();
    const publisherId = new Types.ObjectId().toString();
    const response = await request(app).get(`/r/${missionId}/${publisherId}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://www.service-civique.gouv.fr/");
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

    const response = await request(app).get(`/r/${mission._id.toString()}/${new Types.ObjectId().toString()}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://mission.example.com/apply");
    expect(elasticMock.index).not.toHaveBeenCalled();
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
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "mission-click-id" } });

    const response = await request(app)
      .get(`/r/${mission._id.toString()}/${fromPublisher.id}`)
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ tags: "foo,bar" });

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
    expect(redirectUrl.searchParams.get("apiengagement_id")).toEqual(expect.any(String));
    expect(redirectUrl.searchParams.get("utm_source")).toBe("api_engagement");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("api");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("from-publisher");

    expect(elasticMock.index).toHaveBeenCalled();
    const [indexCall] = elasticMock.index.mock.calls;
    expect(indexCall[0].index).toBe(STATS_INDEX);
    const indexedBody = indexCall[0].body as any;
    expect(indexedBody).toMatchObject({
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      host: "redirect.test",
      origin: "https://app.example.com",
      source: "publisher",
      sourceName: fromPublisher.name,
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
      fromPublisherId: fromPublisher.id,
      fromPublisherName: fromPublisher.name,
      isBot: false,
      tags: ["foo", "bar"],
    });
    expect(indexedBody.sourceId?.toString()).toBe(fromPublisher.id);

    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });
    expect(elasticMock.update).toHaveBeenCalledTimes(1);
    const updateArgs = elasticMock.update.mock.calls[0][0];
    expect(updateArgs.index).toBe(STATS_INDEX);
    expect(updateArgs.body).toEqual({ doc: { isBot: true } });
    expect(updateArgs.id).toBe(indexCall[0].id);
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
      elasticMock.index.mockResolvedValueOnce({ body: { _id: "mission-click-id" } });

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
