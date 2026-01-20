import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { prismaCore } from "../../../../src/db/postgres";
import { statBotService } from "../../../../src/services/stat-bot";
import * as utils from "../../../../src/utils";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createClickStat } from "../../../fixtures/stat-event";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /account", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("returns 204 when identity is missing", async () => {
    const identifySpy = vi.spyOn(utils, "identify").mockReturnValue(null);

    const response = await request(app).get("/r/account").query({ view: "click-id" });

    expect(response.status).toBe(204);
    expect(identifySpy).toHaveBeenCalled();
    expect(await prismaCore.statEvent.count()).toBe(0);
  });

  it("returns 204 when query params are invalid", async () => {
    vi.spyOn(utils, "identify").mockReturnValue({
      user: "user-id",
      referer: "https://example.com",
      userAgent: "Mozilla/5.0",
    });

    const response = await request(app).get("/r/account?view[foo]=bar");

    expect(response.status).toBe(204);
    expect(await prismaCore.statEvent.count()).toBe(0);
  });

  it("records account stats with mission details when available", async () => {
    const publisher = await createTestPublisher();

    const mission = await createTestMission({
      addresses: [
        {
          postalCode: "75001",
          departmentName: "Paris",
          city: "Paris",
        },
      ],
      clientId: "mission-client-id",
      title: "Mission Title",
      publisherId: publisher.id,
      lastSyncAt: new Date(),
      domain: "mission-domain",
      organizationName: "Mission Org",
      organizationClientId: "mission-org-client-id",
    });

    const identity = {
      user: "identity-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue({ user: identity.user } as any);

    const clickStat = await createClickStat("click-123", {
      user: "click-user",
      source: "campaign",
      sourceId: "campaign-id",
      sourceName: "Campaign Name",
      fromPublisherId: publisher.id,
      toPublisherId: publisher.id,
      missionId: mission.id,
      missionClientId: mission.clientId,
      missionTitle: mission.title,
      missionOrganizationName: mission.organizationName ?? "",
      missionOrganizationId: "click-org-id",
    });

    const response = await request(app)
      .get("/r/account")
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ view: "click-123", mission: mission.clientId, publisher: mission.publisherId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: expect.any(String) });
    expect(statsBotFindOneSpy).toHaveBeenCalledWith(identity.user);

    const createdAccount = await prismaCore.statEvent.findUnique({ where: { id: response.body.id } });
    expect(createdAccount).toMatchObject({
      type: "account",
      source: clickStat.source,
      sourceId: clickStat.sourceId,
      sourceName: clickStat.sourceName,
      fromPublisherId: clickStat.fromPublisherId,
      toPublisherId: mission.publisherId,
      missionId: mission._id.toString(),
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
    const statsBotFindOneSpy = vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    const clickStat = await createClickStat("click-456", {
      user: "click-user",
      source: "publisher",
      sourceId: "source-id",
      sourceName: "Source Name",
      missionId: "click-mission-id",
      missionClientId: "click-mission-client-id",
      missionDomain: "click-domain",
      missionTitle: "Click Mission Title",
      missionPostalCode: "33000",
      missionDepartmentName: "Bordeaux",
      missionOrganizationName: "Click Org",
      missionOrganizationId: "click-org-id",
    });

    const response = await request(app).get("/r/account").query({ view: "click-456" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: expect.any(String) });
    expect(statsBotFindOneSpy).toHaveBeenCalledWith(identity.user);

    const storedAccount = await prismaCore.statEvent.findUnique({ where: { id: response.body.id } });
    expect(storedAccount).toMatchObject({
      type: "account",
      source: clickStat.source,
      sourceId: clickStat.sourceId,
      sourceName: clickStat.sourceName,
      fromPublisherId: clickStat.fromPublisherId,
      toPublisherId: clickStat.toPublisherId,
      missionId: clickStat.missionId,
      missionClientId: clickStat.missionClientId,
      isBot: false,
    });
  });
});
