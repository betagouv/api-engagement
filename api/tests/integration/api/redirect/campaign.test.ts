import { Types } from "mongoose";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JVA_URL, STATS_INDEX } from "../../../../src/config";
import CampaignModel from "../../../../src/models/campaign";
import StatsBotModel from "../../../../src/models/stats-bot";
import * as utils from "../../../../src/utils";
import { elasticMock } from "../../../mocks";
import { createTestApp } from "../../../testApp";

describe("RedirectController /campaign/:id", () => {
  const app = createTestApp();

  beforeEach(async () => {
    await CampaignModel.deleteMany({});

    elasticMock.index.mockReset();
    elasticMock.update.mockReset();
    elasticMock.index.mockResolvedValue({ body: { _id: "default-click-id" } });
    elasticMock.update.mockResolvedValue({});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await CampaignModel.deleteMany({});
    delete process.env.WRITE_STATS_DUAL;
  });

  it("redirects to JVA when campaign id is invalid", async () => {
    const response = await request(app).get("/r/campaign/not-a-valid-id");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(JVA_URL);
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("redirects to JVA when campaign does not exist", async () => {
    const unknownId = new Types.ObjectId().toString();

    const response = await request(app).get(`/r/campaign/${unknownId}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(JVA_URL);
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("redirects to campaign url when identity is missing", async () => {
    const campaign = await CampaignModel.create({
      name: "Missing Identity",
      url: "https://campaign.example.com/landing",
      fromPublisherId: "from-publisher",
      toPublisherId: "to-publisher",
    });

    const identifySpy = vi.spyOn(utils, "identify").mockReturnValue(null);

    const response = await request(app).get(`/r/campaign/${campaign._id.toString()}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://campaign.example.com/landing");
    expect(elasticMock.index).not.toHaveBeenCalled();
    expect(identifySpy).toHaveBeenCalled();
  });

  it("records stats and appends tracking parameters when identity is present", async () => {
    const campaign = await CampaignModel.create({
      name: "Campaign Name",
      url: "https://campaign.example.com/path",
      fromPublisherId: "from-publisher",
      fromPublisherName: "From Publisher",
      toPublisherId: "to-publisher",
      toPublisherName: "To Publisher",
    });

    const identity = {
      user: "user-identifier",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue({ user: identity.user } as any);
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "click-123" } });

    const response = await request(app).get(`/r/campaign/${campaign._id.toString()}`);

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://campaign.example.com/path");
    expect(redirectUrl.searchParams.get("utm_source")).toBe("api_engagement");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("campaign");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("campaign-name");
    expect(redirectUrl.searchParams.get("apiengagement_id")).toEqual(expect.any(String));

    expect(elasticMock.index).toHaveBeenCalledTimes(1);
    const [indexArgs] = elasticMock.index.mock.calls;
    expect(indexArgs[0].index).toBe(STATS_INDEX);
    expect(indexArgs[0].body).toMatchObject({
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      source: "campaign",
      sourceId: campaign._id.toString(),
      sourceName: campaign.name,
      toPublisherId: campaign.toPublisherId,
      toPublisherName: campaign.toPublisherName,
      fromPublisherId: campaign.fromPublisherId,
      fromPublisherName: campaign.fromPublisherName,
      isBot: false,
    });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });

    expect(elasticMock.update).toHaveBeenCalledTimes(1);
    const updateArgs = elasticMock.update.mock.calls[0][0];
    expect(updateArgs.index).toBe(STATS_INDEX);
    expect(updateArgs.body).toEqual({ doc: { isBot: true } });
    expect(updateArgs.id).toBe(indexArgs[0].id);
  });
});
