import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { prisma } from "@/db/postgres";
import { campaignService } from "@/services/campaign";
import { publisherService } from "@/services/publisher";
import { statBotService } from "@/services/stat-bot";
import * as utils from "@/utils";
import { createTestMission, createTestPublisher } from "../../../../fixtures";
import { createTestApp } from "../../../../testApp";

const app = createTestApp();

describe("RedirectController /:missionId/:publisherId", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("redirects to Service Civique when params are invalid", async () => {
    const uuid = randomUUID();
    const response = await request(app).get(`/r/${uuid}/invalid`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://www.service-civique.gouv.fr/");
    expect(await prisma.statEvent.count()).toBe(0);
  });

  it("redirects to Service Civique when mission is not found and identity is missing", async () => {
    vi.spyOn(utils, "identify").mockReturnValue(null);

    const missionId = randomUUID();
    const publisherId = randomUUID();
    const response = await request(app).get(`/r/${missionId}/${publisherId}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://www.service-civique.gouv.fr/");
    expect(await prisma.statEvent.count()).toBe(0);
  });

  it("redirects to mission application URL when identity is missing but mission exists", async () => {
    const uuid = randomUUID();
    const mission = await createTestMission({
      addresses: [
        {
          postalCode: "75001",
          departmentName: "Paris",
          city: "Paris",
        },
      ],
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: randomUUID(),
      title: "Mission Title",
    });

    vi.spyOn(utils, "identify").mockReturnValue(null);

    const response = await request(app).get(`/r/${mission.id}/${uuid}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://mission.example.com/apply");
    expect(await prisma.statEvent.count()).toBe(0);
  });

  it("records click stats and appends tracking parameters when identity and publisher exist", async () => {
    const fromPublisher = await publisherService.createPublisher({ name: "From Publisher" });
    const missionPublisher = await publisherService.createPublisher({ name: "Mission Publisher" });
    const userScoring = await prisma.userScoring.create({ data: { distinctId: "quiz-user" } });

    const mission = await createTestMission({
      addresses: [
        {
          postalCode: "75001",
          departmentName: "Paris",
          city: "Paris",
        },
      ],
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      domain: "mission.example.com",
      title: "Mission Title",
      organizationName: "Mission Org",
      organizationClientId: "mission-org-client-id",
      lastSyncAt: new Date(),
      publisherId: missionPublisher.id,
    });

    const identity = {
      user: "mission-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue({ user: identity.user } as any);

    const response = await request(app)
      .get(`/r/${mission.id}/${fromPublisher.id}`)
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ tags: "foo,bar", user_scoring_id: userScoring.id });

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
    const clickId = redirectUrl.searchParams.get("apiengagement_id");
    expect(clickId).toBeTruthy();
    expect(redirectUrl.searchParams.get("apiengagement_tracking_token")).toEqual(expect.any(String));
    expect(redirectUrl.searchParams.get("utm_source")).toBe("api_engagement");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("api");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("from-publisher");

    // The handler updates isBot asynchronously after sending the redirect response,
    // so we need to wait for that background work to complete before asserting.
    await vi.waitFor(
      async () => {
        const row = await prisma.statEvent.findUnique({ where: { id: clickId! } });
        expect(row?.isBot).toBe(true);
      },
      { timeout: 2000, interval: 50 }
    );

    const storedClick = await prisma.statEvent.findUnique({ where: { id: clickId! } });
    expect(storedClick).toMatchObject({
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      host: "redirect.test",
      origin: "https://app.example.com",
      source: "publisher",
      sourceName: fromPublisher.name,
      missionId: mission.id,
      toPublisherId: mission.publisherId,
      fromPublisherId: fromPublisher.id,
      tags: ["foo", "bar"],
      customAttributes: { user_scoring_id: userScoring.id },
      isBot: true,
    });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith(identity.user);
  });

  it("records the campaign click independently of quiz scoring and keeps TTM as the publisher", async () => {
    const ttm = await createTestPublisher({ id: PUBLISHER_IDS.PLATEFORME_ENGAGEMENT, name: "Trouve Ta Mission" });
    const advertiser = await publisherService.createPublisher({ name: "Mission Publisher" });
    const campaign = await campaignService.createCampaign({
      name: "TTM Campaign",
      type: "OTHER",
      url: "https://trouvetamission.gouv.fr/missions",
      fromPublisherId: advertiser.id,
      toPublisherId: advertiser.id,
    });
    const mission = await createTestMission({
      applicationUrl: "https://mission.example.com/apply",
      publisherId: advertiser.id,
    });
    const scoring = await prisma.userScoring.create({ data: { distinctId: "quiz-user" } });
    vi.spyOn(utils, "identify").mockReturnValue({ user: "mission-user", referer: "", userAgent: "Mozilla/5.0" });
    vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    const landing = await request(app).get(`/r/campaign/${campaign.id}`);
    const originClickId = new URL(landing.headers.location).searchParams.get("apiengagement_id")!;
    const redirect = async (origin: string, scoringId?: string) => {
      const response = await request(app)
        .get(`/r/${mission.id}/${ttm.id}`)
        .query({ origin_click_id: origin, ...(scoringId ? { user_scoring_id: scoringId } : {}) });
      expect(response.status).toBe(302);
      const url = new URL(response.headers.location);
      expect(url.searchParams.has("origin_click_id")).toBe(false);
      return prisma.statEvent.findUniqueOrThrow({ where: { id: url.searchParams.get("apiengagement_id")! } });
    };

    const withoutQuiz = await redirect(originClickId);
    expect(withoutQuiz).toMatchObject({
      fromPublisherId: ttm.id,
      toPublisherId: advertiser.id,
      source: "publisher",
      customAttributes: { origin_click_id: originClickId },
    });
    expect((await redirect(originClickId, scoring.id)).customAttributes).toEqual({ origin_click_id: originClickId, user_scoring_id: scoring.id });
    expect((await redirect(originClickId, "invalid")).customAttributes).toEqual({ origin_click_id: originClickId });
    for (const invalidOrigin of ["invalid", randomUUID(), withoutQuiz.id]) {
      expect((await redirect(invalidOrigin, scoring.id)).customAttributes).toEqual({ user_scoring_id: scoring.id });
    }
  });

  it("records clicks without custom attributes when user scoring is absent, invalid or unknown", async () => {
    const fromPublisher = await publisherService.createPublisher({ name: "From Publisher" });
    const missionPublisher = await publisherService.createPublisher({ name: "Mission Publisher" });
    const mission = await createTestMission({
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: missionPublisher.id,
      title: "Mission Title",
    });

    vi.spyOn(utils, "identify").mockReturnValue({ user: "mission-user", referer: "https://referrer.example.com", userAgent: "Mozilla/5.0" });
    vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    const response = await request(app).get(`/r/${mission.id}/${fromPublisher.id}`).query({ user_scoring_id: randomUUID() });

    expect(response.status).toBe(302);
    const clickId = new URL(response.headers.location).searchParams.get("apiengagement_id");
    expect(clickId).toBeTruthy();
    expect((await prisma.statEvent.findUnique({ where: { id: clickId! } }))?.customAttributes).toBeNull();

    const responseWithoutUserScoring = await request(app).get(`/r/${mission.id}/${fromPublisher.id}`);
    const clickIdWithoutUserScoring = new URL(responseWithoutUserScoring.headers.location).searchParams.get("apiengagement_id");
    expect(responseWithoutUserScoring.status).toBe(302);
    expect(clickIdWithoutUserScoring).toBeTruthy();
    expect((await prisma.statEvent.findUnique({ where: { id: clickIdWithoutUserScoring! } }))?.customAttributes).toBeNull();

    const responseWithInvalidUserScoring = await request(app).get(`/r/${mission.id}/${fromPublisher.id}`).query({ user_scoring_id: "invalid" });
    const clickIdWithInvalidUserScoring = new URL(responseWithInvalidUserScoring.headers.location).searchParams.get("apiengagement_id");
    expect(responseWithInvalidUserScoring.status).toBe(302);
    expect(clickIdWithInvalidUserScoring).toBeTruthy();
    expect((await prisma.statEvent.findUnique({ where: { id: clickIdWithInvalidUserScoring! } }))?.customAttributes).toBeNull();
  });

  it("uses mtm tracking parameters for Service Civique missions", async () => {
    const fromPublisher = await publisherService.createPublisher({ name: "From Publisher" });
    const serviceCiviquePublisherId = PUBLISHER_IDS.SERVICE_CIVIQUE || randomUUID();
    if (!PUBLISHER_IDS.SERVICE_CIVIQUE) {
      PUBLISHER_IDS.SERVICE_CIVIQUE = serviceCiviquePublisherId;
    }
    const serviceCiviquePublisher = await publisherService.createPublisher({ name: "Service Civique", id: serviceCiviquePublisherId });

    const mission = await createTestMission({
      addresses: [
        {
          city: "Paris",
          postalCode: "75001",
          departmentName: "Paris",
        },
      ],
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: serviceCiviquePublisher.id,
      title: "Mission Title",
    });

    const identity = {
      user: "mission-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    const response = await request(app).get(`/r/${mission.id}/${fromPublisher.id}`).query({ tags: "foo" });

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
    expect(redirectUrl.searchParams.get("apiengagement_id")).toEqual(expect.any(String));
    expect(redirectUrl.searchParams.get("mtm_source")).toBe("api_engagement");
    expect(redirectUrl.searchParams.get("mtm_medium")).toBe("api");
    expect(redirectUrl.searchParams.get("mtm_campaign")).toBe("from-publisher");
  });

  it("records email click stats with user scoring context and appends email tracking parameters", async () => {
    const emailPublisher = await publisherService.createPublisher({ name: "Email Publisher" });
    const missionPublisher = await publisherService.createPublisher({ name: "Mission Publisher" });
    const userScoring = await prisma.userScoring.create({
      data: { distinctId: "distinct-user-1" },
    });

    const mission = await createTestMission({
      addresses: [
        {
          postalCode: "75001",
          departmentName: "Paris",
          city: "Paris",
        },
      ],
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: missionPublisher.id,
      title: "Mission Title",
    });

    const identity = {
      user: "mission-user",
      referer: "https://email.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    const response = await request(app)
      .get(`/r/email/${mission.id}/${emailPublisher.id}`)
      .query({ user_scoring_id: userScoring.id, email_source: "quiz" })
      .set("Host", "redirect.test")
      .set("Origin", "https://email.example.com");

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
    const clickId = redirectUrl.searchParams.get("apiengagement_id");
    expect(clickId).toBeTruthy();
    expect(redirectUrl.searchParams.get("utm_source")).toBe("email-publisher");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("email");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("user_scoring");

    const storedClick = await prisma.statEvent.findUnique({ where: { id: clickId! } });
    expect(storedClick).toMatchObject({
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      host: "redirect.test",
      origin: "https://email.example.com",
      source: "email",
      sourceId: "",
      sourceName: "email",
      customAttributes: {
        user_scoring_id: userScoring.id,
        email_source: "quiz",
      },
      missionId: mission.id,
      toPublisherId: mission.publisherId,
      fromPublisherId: emailPublisher.id,
      isBot: false,
    });
  });

  it("records email click stats without user scoring context", async () => {
    const emailPublisher = await publisherService.createPublisher({ name: "Email Publisher" });
    const missionPublisher = await publisherService.createPublisher({ name: "Mission Publisher" });
    const mission = await createTestMission({
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: missionPublisher.id,
      title: "Mission Title",
    });

    const identity = {
      user: "mission-user",
      referer: "https://email.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    const response = await request(app).get(`/r/email/${mission.id}/${emailPublisher.id}`).set("Host", "redirect.test").set("Origin", "https://email.example.com");

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
    const clickId = redirectUrl.searchParams.get("apiengagement_id");
    expect(clickId).toBeTruthy();
    expect(redirectUrl.searchParams.get("utm_source")).toBe("email-publisher");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("email");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("mission_email");

    const storedClick = await prisma.statEvent.findUnique({ where: { id: clickId! } });
    expect(storedClick).toMatchObject({
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      host: "redirect.test",
      origin: "https://email.example.com",
      source: "email",
      sourceId: "",
      sourceName: "email",
      customAttributes: {},
      missionId: mission.id,
      toPublisherId: mission.publisherId,
      fromPublisherId: emailPublisher.id,
      isBot: false,
    });
  });

  it("redirects without creating stats when email user scoring is not found", async () => {
    const emailPublisher = await publisherService.createPublisher({ name: "Email Publisher" });
    const missionPublisher = await publisherService.createPublisher({ name: "Mission Publisher" });
    const mission = await createTestMission({
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: missionPublisher.id,
      title: "Mission Title",
    });

    vi.spyOn(utils, "identify").mockReturnValue({
      user: "mission-user",
      referer: "https://email.example.com",
      userAgent: "Mozilla/5.0",
    });

    const response = await request(app).get(`/r/email/${mission.id}/${emailPublisher.id}`).query({ user_scoring_id: randomUUID() });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://mission.example.com/apply");
    expect(await prisma.statEvent.count()).toBe(0);
  });

  it("redirects without creating stats when email publisher is not found", async () => {
    const missionPublisher = await publisherService.createPublisher({ name: "Mission Publisher" });
    const mission = await createTestMission({
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: missionPublisher.id,
      title: "Mission Title",
    });

    vi.spyOn(utils, "identify").mockReturnValue({
      user: "mission-user",
      referer: "https://email.example.com",
      userAgent: "Mozilla/5.0",
    });

    const response = await request(app).get(`/r/email/${mission.id}/${randomUUID()}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://mission.example.com/apply");
    expect(await prisma.statEvent.count()).toBe(0);
  });
});
