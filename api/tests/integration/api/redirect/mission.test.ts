import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PUBLISHER_IDS } from "../../../../src/config";
import { prisma } from "../../../../src/db/postgres";
import { publisherService } from "../../../../src/services/publisher";
import { statBotService } from "../../../../src/services/stat-bot";
import * as utils from "../../../../src/utils";
import { createTestMission } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

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
    const missionPublisher = await prisma.publisher.create({
      data: {
        id: randomUUID(),
        name: "Mission Publisher",
      },
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
      .query({ tags: "foo,bar" });

    expect(response.status).toBe(302);
    const redirectUrl = new URL(response.headers.location);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://mission.example.com/apply");
    const clickId = redirectUrl.searchParams.get("apiengagement_id");
    expect(clickId).toBeTruthy();
    expect(redirectUrl.searchParams.get("utm_source")).toBe("api_engagement");
    expect(redirectUrl.searchParams.get("utm_medium")).toBe("api");
    expect(redirectUrl.searchParams.get("utm_campaign")).toBe("from-publisher");

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
      missionClientId: mission.clientId,
      missionDomain: mission.domain,
      missionTitle: mission.title,
      missionPostalCode: mission.postalCode,
      missionDepartmentName: mission.departmentName,
      missionOrganizationName: mission.organizationName ?? "",
      missionOrganizationId: mission.organizationId,
      missionOrganizationClientId: mission.organizationClientId,
      toPublisherId: mission.publisherId,
      fromPublisherId: fromPublisher.id,
      tags: ["foo", "bar"],
      isBot: true,
    });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith(identity.user);
  });

  it("uses mtm tracking parameters for Service Civique missions", async () => {
    const fromPublisher = await publisherService.createPublisher({ name: "From Publisher" });
    const serviceCiviquePublisherId = PUBLISHER_IDS.SERVICE_CIVIQUE || new Types.ObjectId().toString();
    if (!PUBLISHER_IDS.SERVICE_CIVIQUE) {
      PUBLISHER_IDS.SERVICE_CIVIQUE = serviceCiviquePublisherId;
    }
    const serviceCiviquePublisher = await prisma.publisher.create({
      data: { id: serviceCiviquePublisherId, name: "Service Civique" },
    });

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
});
