import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JVA_URL } from "../../../../src/config";
import { prismaCore } from "../../../../src/db/postgres";
import StatsBotModel from "../../../../src/models/stats-bot";
import { campaignService } from "../../../../src/services/campaign";
import * as utils from "../../../../src/utils";
import { createTestApp } from "../../../testApp";

describe("RedirectController /campaign/:id", () => {
  const app = createTestApp();

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("redirects to JVA when campaign id is invalid", async () => {
    const response = await request(app).get("/r/campaign/not-a-valid-id");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(JVA_URL);
    expect(await prismaCore.statEvent.count()).toBe(0);
  });

  it("redirects to JVA when campaign does not exist", async () => {
    const unknownId = "000000000000000000000000"; // MongoDB ObjectId format for backward compatibility

    const response = await request(app).get(`/r/campaign/${unknownId}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(JVA_URL);
    expect(await prismaCore.statEvent.count()).toBe(0);
  });

  it("redirects to campaign url when identity is missing", async () => {
    const campaign = await campaignService.createCampaign({
      name: "Missing Identity",
      type: "autre",
      url: "https://campaign.example.com/landing",
      fromPublisherId: "from-publisher",
      toPublisherId: "to-publisher",
    });

    const identifySpy = vi.spyOn(utils, "identify").mockReturnValue(null);

    const response = await request(app).get(`/r/campaign/${campaign.id}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://campaign.example.com/landing");
    expect(identifySpy).toHaveBeenCalled();
    expect(await prismaCore.statEvent.count()).toBe(0);
  });

  it("records stats and appends tracking parameters when identity is present", async () => {
    const campaign = await campaignService.createCampaign({
      name: "Campaign Name",
      type: "autre",
      url: "https://campaign.example.com/path",
      fromPublisherId: "from-publisher",
      toPublisherId: "to-publisher",
    });

    const identity = {
      user: "user-identifier",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue({ user: identity.user } as any);

    const response = await request(app).get(`/r/campaign/${campaign.id}`);

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://campaign.example.com/path");
    expect(redirectUrl.searchParams.get("utm_source")).toBe("api_engagement");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("campaign");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("campaign-name");

    const clickId = redirectUrl.searchParams.get("apiengagement_id");
    expect(clickId).toBeTruthy();

    const storedClick = await prismaCore.statEvent.findUnique({ where: { id: clickId! } });
    expect(storedClick).toMatchObject({
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      source: "campaign",
      sourceId: campaign.id,
      sourceName: campaign.name,
      toPublisherId: campaign.toPublisherId,
      fromPublisherId: campaign.fromPublisherId,
      isBot: false,
    });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });
  });
});
