import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../../../../src/db/postgres";
import { NOT_FOUND } from "../../../../src/error";
import { publisherService } from "../../../../src/services/publisher";
import { statBotService } from "../../../../src/services/stat-bot";
import { widgetService } from "../../../../src/services/widget";
import { StatEventRecord } from "../../../../src/types";
import * as utils from "../../../../src/utils";
import { createTestMission } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /impression/:missionId/:publisherId", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("returns 204 when identity is missing", async () => {
    vi.spyOn(utils, "identify").mockReturnValue(null);

    const missionId = randomUUID();
    const publisherId = randomUUID();
    const response = await request(app).get(`/r/impression/${missionId}/${publisherId}`);

    expect(response.status).toBe(204);
    expect(await prisma.statEvent.count()).toBe(0);
  });

  it("returns 404 when mission is not found", async () => {
    const identity = { user: "user", referer: "https://ref", userAgent: "Mozilla" };
    vi.spyOn(utils, "identify").mockReturnValue(identity);

    const missionId = randomUUID();
    const publisherId = randomUUID();
    const response = await request(app).get(`/r/impression/${missionId}/${publisherId}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ ok: false, code: NOT_FOUND });
    expect(await prisma.statEvent.count()).toBe(0);
  });

  it("returns 404 when publisher is not found", async () => {
    const identity = { user: "user", referer: "https://ref", userAgent: "Mozilla" };
    vi.spyOn(utils, "identify").mockReturnValue(identity);

    const mission = await createTestMission({
      addresses: [
        {
          city: "Paris",
        },
      ],
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: randomUUID(),
      title: "Mission Title",
    });

    const response = await request(app).get(`/r/impression/${mission.id}/${randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ ok: false, code: NOT_FOUND });
    expect(await prisma.statEvent.count()).toBe(0);
  });

  it("records print stats with widget source when all data is present", async () => {
    const publisher = await publisherService.createPublisher({ name: "From Publisher" });
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
      publisherId: publisher.id,
    });

    const widget = await widgetService.createWidget({ name: "Widget Name", fromPublisherId: publisher.id });

    const identity = {
      user: "print-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue({ user: identity.user } as any);

    const requestId = randomUUID();
    const response = await request(app)
      .get(`/r/impression/${mission.id}/${publisher.id}`)
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ tracker: "tag", sourceId: widget.id, requestId });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(statsBotFindOneSpy).toHaveBeenCalledWith(identity.user);

    const createdPrint = await prisma.statEvent.findUnique({ where: { id: response.body.data._id } });
    expect(createdPrint).toMatchObject({
      type: "print",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      host: "redirect.test",
      origin: "https://app.example.com",
      requestId,
      tag: "tag",
      source: "widget",
      sourceId: widget.id,
      sourceName: widget.name,
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
      fromPublisherId: publisher.id,
      isBot: true,
    });

    expect(response.body.data).toMatchObject({
      _id: createdPrint?.id,
      type: "print",
      tag: "tag",
      source: "widget",
      sourceId: widget.id,
      sourceName: widget.name,
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
      toPublisherName: mission.publisherName,
      fromPublisherId: publisher.id,
      fromPublisherName: publisher.name,
      isBot: true,
    });
  });

  it("returns 200 and records print stats when query has only tracker", async () => {
    const publisher = await publisherService.createPublisher({ name: "From Publisher" });
    const mission = await createTestMission({
      addresses: [
        {
          city: "Paris",
        },
      ],
      applicationUrl: "https://mission.example.com/apply",
      clientId: "mission-client-id",
      lastSyncAt: new Date(),
      publisherId: publisher.id,
      title: "Mission Title",
    });

    const identity = {
      user: "print-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    vi.spyOn(statBotService, "findStatBotByUser").mockResolvedValue(null);

    const response = await request(app).get(`/r/impression/${mission.id}/${publisher.id}`).query({ tracker: "tag" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.source).toBe("jstag");
    expect(response.body.data.isBot).toBe(false);

    const storedPrint = await prisma.statEvent.findUnique({ where: { id: response.body.data._id } });
    expect(storedPrint).toMatchObject({
      type: "print",
      tag: "tag",
      source: "jstag",
      sourceId: "",
      isBot: false,
      missionId: mission.id,
      toPublisherId: mission.publisherId,
    } as Partial<StatEventRecord>);
  });
});
