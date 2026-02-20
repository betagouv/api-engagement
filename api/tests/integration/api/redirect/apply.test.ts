import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { prismaCore } from "@/db/postgres";
import { statBotService } from "@/services/stat-bot";
import * as utils from "@/utils";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createClickStat } from "../../../fixtures/stat-event";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /apply", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 204 when identity is missing", async () => {
    const identifySpy = vi.spyOn(utils, "identify").mockReturnValue(null);

    const response = await request(app).get("/r/apply").query({ view: "click-id" });

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

    const response = await request(app).get("/r/apply?view[foo]=bar");

    expect(response.status).toBe(204);
    expect(await prismaCore.statEvent.count()).toBe(0);
  });

  it("records apply stats with mission details when available", async () => {
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
    });

    const response = await request(app)
      .get("/r/apply")
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ view: "click-123", mission: mission.clientId, publisher: mission.publisherId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: expect.any(String) });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith(identity.user);
    const createdApply = await prismaCore.statEvent.findUnique({ where: { id: response.body.id } });
    expect(createdApply).toMatchObject({
      type: "apply",
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
      toPublisherId: mission.publisherId,
      missionId: mission.id,
      missionClientId: mission.clientId,
      isBot: true,
    });
  });

  it("records apply stats with click mission data when mission is absent", async () => {
    const identity = {
      user: "another-identity-user",
      referer: "https://another-referrer.example.com",
      userAgent: "Mozilla/5.0",
    };
    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    const publisher = await createTestPublisher();

    const clickStat = await createClickStat("click-456", {
      user: "click-user",
      source: "publisher",
      sourceId: "source-id",
      sourceName: "Source Name",
      missionId: "click-mission-id",
      missionClientId: "click-mission-client-id",
      toPublisherId: publisher.id,
    });

    const response = await request(app).get("/r/apply").query({ view: "click-456" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: expect.any(String) });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith(identity.user);
    const storedApply = await prismaCore.statEvent.findUnique({ where: { id: response.body.id } });
    expect(storedApply).toMatchObject({
      type: "apply",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      clickUser: clickStat.user,
      clickId: "click-456",
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

  it("records apply stats with custom attributes when provided", async () => {
    const identity = {
      user: "custom-identity-user",
      referer: "https://custom-referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    await createClickStat("click-789", {
      user: "click-user",
      source: "publisher",
      sourceId: "source-id",
      sourceName: "Source Name",
      fromPublisherId: "source-publisher-id",
      fromPublisherName: "Source Publisher",
      toPublisherId: "to-publisher-id",
      toPublisherName: "To Publisher",
    });

    const customAttributes = { candidateId: "candidate-123", metadata: { source: "asc" } };

    const response = await request(app)
      .get("/r/apply")
      .query({ view: "click-789", customAttributes: JSON.stringify(customAttributes) });

    expect(response.status).toBe(200);
    const storedApply = await prismaCore.statEvent.findUnique({ where: { id: response.body.id } });
    expect(storedApply?.customAttributes).toEqual(customAttributes);
  });

  it("records apply stats with clientEventId when provided", async () => {
    const identity = {
      user: "client-event-user",
      referer: "https://client-event.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    await createClickStat("click-client-event", {
      user: "click-user",
      source: "publisher",
      sourceId: "source-id",
      sourceName: "Source Name",
      fromPublisherId: "source-publisher-id",
      toPublisherId: "to-publisher-id",
    });

    const response = await request(app).get("/r/apply").query({ view: "click-client-event", clientEventId: "client-event-apply-1" });

    expect(response.status).toBe(200);
    const storedApply = await prismaCore.statEvent.findUnique({ where: { id: response.body.id } });
    expect(storedApply?.clientEventId).toBe("client-event-apply-1");
  });

  it("returns 204 when custom attributes payload is invalid JSON", async () => {
    vi.spyOn(utils, "identify").mockReturnValue({
      user: "invalid-identity-user",
      referer: "https://invalid.example.com",
      userAgent: "Mozilla/5.0",
    });

    const response = await request(app).get("/r/apply").query({ view: "click-invalid", customAttributes: "{invalid" });

    expect(response.status).toBe(204);
    expect(await prismaCore.statEvent.count()).toBe(0);
  });
});
