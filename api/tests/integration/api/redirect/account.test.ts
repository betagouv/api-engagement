import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prismaCore } from "../../../../src/db/postgres";
import MissionModel from "../../../../src/models/mission";
import StatsBotModel from "../../../../src/models/stats-bot";
import * as utils from "../../../../src/utils";
import { createClickStat } from "../../../fixtures/stat-event";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /account", () => {
  beforeEach(async () => {
    await MissionModel.deleteMany({});
    await prismaCore.statEvent.deleteMany({});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await MissionModel.deleteMany({});
    await prismaCore.statEvent.deleteMany({});
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
    const mission = await MissionModel.create({
      clientId: "mission-client-id",
      title: "Mission Title",
      publisherId: "mission-publisher-id",
      publisherName: "Mission Publisher",
      lastSyncAt: new Date(),
      domain: "mission-domain",
      postalCode: "75001",
      departmentName: "Paris",
      organizationName: "Mission Org",
      organizationId: "mission-org-id",
      organizationClientId: "mission-org-client-id",
    });

    const identity = {
      user: "identity-user",
      referer: "https://referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue({ user: identity.user } as any);

    const clickStat = await createClickStat("click-123", {
      user: "click-user",
      source: "campaign",
      sourceId: "campaign-id",
      sourceName: "Campaign Name",
      fromPublisherId: "source-publisher-id",
      fromPublisherName: "Source Publisher",
      toPublisherId: "click-publisher-id",
      toPublisherName: "Click Publisher",
      missionId: "click-mission-id",
      missionClientId: "click-mission-client-id",
      missionDomain: "click-domain",
      missionTitle: "Click Mission Title",
      missionPostalCode: "69000",
      missionDepartmentName: "Lyon",
      missionOrganizationName: "Click Org",
      missionOrganizationId: "click-org-id",
    });

    const response = await request(app)
      .get("/r/account")
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ view: "click-123", mission: mission.clientId, publisher: mission.publisherId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: expect.any(String) });
    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });

    const createdAccount = await prismaCore.statEvent.findUnique({ where: { id: response.body.id } });
    expect(createdAccount).toMatchObject({
      type: "account",
      user: identity.user,
      referer: identity.referer,
      user_agent: identity.userAgent,
      host: "redirect.test",
      origin: "https://app.example.com",
      click_user: clickStat.user,
      click_id: "click-123",
      source: clickStat.source,
      source_id: clickStat.sourceId,
      source_name: clickStat.sourceName,
      from_publisher_id: clickStat.fromPublisherId,
      to_publisher_id: mission.publisherId,
      mission_id: mission._id.toString(),
      mission_client_id: mission.clientId,
      mission_domain: mission.domain,
      mission_title: mission.title,
      mission_postal_code: mission.postalCode,
      mission_department_name: mission.departmentName,
      mission_organization_name: mission.organizationName,
      mission_organization_id: mission.organizationId,
      mission_organization_client_id: mission.organizationClientId,
      is_bot: true,
    });
  });

  it("records account stats with click mission data when mission is absent", async () => {
    const identity = {
      user: "another-identity-user",
      referer: "https://another-referrer.example.com",
      userAgent: "Mozilla/5.0",
    };
    vi.spyOn(utils, "identify").mockReturnValue(identity);
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue(null);

    const clickStat = await createClickStat("click-456", {
      user: "click-user",
      source: "publisher",
      sourceId: "source-id",
      sourceName: "Source Name",
      fromPublisherId: "source-publisher-id",
      fromPublisherName: "Source Publisher",
      toPublisherId: "to-publisher-id",
      toPublisherName: "To Publisher",
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
    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });

    const storedAccount = await prismaCore.statEvent.findUnique({ where: { id: response.body.id } });
    expect(storedAccount).toMatchObject({
      type: "account",
      user: identity.user,
      referer: identity.referer,
      user_agent: identity.userAgent,
      click_user: clickStat.user,
      click_id: "click-456",
      source: clickStat.source,
      source_id: clickStat.sourceId,
      source_name: clickStat.sourceName,
      from_publisher_id: clickStat.fromPublisherId,
      to_publisher_id: clickStat.toPublisherId,
      mission_id: clickStat.missionId,
      mission_client_id: clickStat.missionClientId,
      mission_title: clickStat.missionTitle,
      mission_domain: clickStat.missionDomain,
      mission_organization_name: clickStat.missionOrganizationName,
      mission_organization_id: clickStat.missionOrganizationId,
      mission_postal_code: clickStat.missionPostalCode,
      mission_department_name: clickStat.missionDepartmentName,
      is_bot: false,
    });
  });
});
