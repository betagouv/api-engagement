import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STATS_INDEX } from "../../../../src/config";
import MissionModel from "../../../../src/models/mission";
import StatsBotModel from "../../../../src/models/stats-bot";
import * as utils from "../../../../src/utils";
import { elasticMock, pgMock } from "../../../mocks";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("RedirectController /apply", () => {
  beforeEach(async () => {
    elasticMock.index.mockReset();
    elasticMock.count.mockReset();
    elasticMock.get.mockReset();

    pgMock.statEvent.create.mockReset();
    pgMock.statEvent.count.mockReset();
    pgMock.statEvent.findUnique.mockReset();

    elasticMock.index.mockResolvedValue({ body: { _id: "default-apply-id" } });
    elasticMock.count.mockResolvedValue({ body: { count: 0 } });
    elasticMock.get.mockResolvedValue({
      body: {
        _id: "default-click-id",
        _source: {},
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.READ_STATS_FROM;
    delete process.env.WRITE_STATS_DUAL;
  });

  it("returns 204 when identity is missing", async () => {
    const identifySpy = vi.spyOn(utils, "identify").mockReturnValue(null);

    const response = await request(app).get("/r/apply").query({ view: "click-id" });

    expect(response.status).toBe(204);
    expect(identifySpy).toHaveBeenCalled();
    expect(elasticMock.get).not.toHaveBeenCalled();
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("returns 204 when query params are invalid", async () => {
    vi.spyOn(utils, "identify").mockReturnValue({
      user: "user-id",
      referer: "https://example.com",
      userAgent: "Mozilla/5.0",
    });

    const response = await request(app).get("/r/apply?view[foo]=bar");

    expect(response.status).toBe(204);
    expect(elasticMock.get).not.toHaveBeenCalled();
    expect(elasticMock.index).not.toHaveBeenCalled();
  });

  it("records apply stats with mission details when available", async () => {
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

    const clickStat = {
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
    };

    elasticMock.get.mockResolvedValueOnce({
      body: {
        _id: "click-123",
        _source: clickStat,
      },
    });
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "apply-123" } });

    const response = await request(app)
      .get("/r/apply")
      .set("Host", "redirect.test")
      .set("Origin", "https://app.example.com")
      .query({ view: "click-123", mission: mission.clientId, publisher: mission.publisherId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: expect.any(String) });

    expect(elasticMock.get).toHaveBeenCalledWith({ index: STATS_INDEX, id: "click-123" });
    expect(elasticMock.count).toHaveBeenCalled();
    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });

    expect(elasticMock.index).toHaveBeenCalledTimes(1);
    const [indexArgs] = elasticMock.index.mock.calls;
    expect(indexArgs[0].index).toBe(STATS_INDEX);
    expect(indexArgs[0].body).toMatchObject({
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
      fromPublisherName: clickStat.fromPublisherName,
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,
      missionId: mission._id.toString(),
      missionClientId: mission.clientId,
      missionDomain: mission.domain,
      missionTitle: mission.title,
      missionPostalCode: mission.postalCode,
      missionDepartmentName: mission.departmentName,
      missionOrganizationName: mission.organizationName,
      missionOrganizationId: mission.organizationId,
      missionOrganizationClientId: mission.organizationClientId,
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
    const statsBotFindOneSpy = vi.spyOn(StatsBotModel, "findOne").mockResolvedValue(null);

    const clickStat = {
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
    };

    elasticMock.get.mockResolvedValueOnce({
      body: {
        _id: "click-456",
        _source: clickStat,
      },
    });
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "apply-456" } });

    const response = await request(app).get("/r/apply").query({ view: "click-456" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: expect.any(String) });

    expect(statsBotFindOneSpy).toHaveBeenCalledWith({ user: identity.user });
    expect(elasticMock.count).toHaveBeenCalled();
    expect(elasticMock.index).toHaveBeenCalledTimes(1);
    const [applyCall] = elasticMock.index.mock.calls;
    expect(applyCall[0].index).toBe(STATS_INDEX);
    expect(applyCall[0].body).toMatchObject({
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
      fromPublisherName: clickStat.fromPublisherName,
      toPublisherId: clickStat.toPublisherId,
      toPublisherName: clickStat.toPublisherName,
      missionId: clickStat.missionId,
      missionClientId: clickStat.missionClientId,
      missionTitle: clickStat.missionTitle,
      missionDomain: clickStat.missionDomain,
      missionOrganizationName: clickStat.missionOrganizationName,
      missionOrganizationId: clickStat.missionOrganizationId,
      missionPostalCode: clickStat.missionPostalCode,
      missionDepartmentName: clickStat.missionDepartmentName,
      isBot: false,
    });
  });

  it("reads click data from Postgres and writes dual stats when enabled", async () => {
    process.env.READ_STATS_FROM = "pg";
    process.env.WRITE_STATS_DUAL = "true";

    const identity = {
      user: "pg-identity-user",
      referer: "https://pg-referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    vi.spyOn(StatsBotModel, "findOne").mockResolvedValue(null);

    const createdAt = new Date();
    pgMock.statEvent.findUnique.mockResolvedValueOnce({
      id: "pg-click-123",
      type: "click",
      created_at: createdAt,
      origin: "https://origin.example.com",
      referer: "https://referer.example.com",
      user_agent: "Mozilla/5.0",
      host: "redirect.test",
      user: "click-user",
      click_user: "click-user",
      source: "campaign",
      source_id: "campaign-id",
      source_name: "Campaign Name",
      from_publisher_id: "source-publisher-id",
      from_publisher_name: "Source Publisher",
      to_publisher_id: "to-publisher-id",
      to_publisher_name: "To Publisher",
      mission_id: "mission-id",
      mission_client_id: "mission-client-id",
      mission_domain: "mission-domain",
      mission_title: "Mission Title",
      mission_postal_code: "33000",
      mission_department_name: "Gironde",
      mission_organization_name: "Mission Org",
      mission_organization_id: "mission-org-id",
      mission_organization_client_id: "mission-org-client-id",
    });

    pgMock.statEvent.count.mockResolvedValue(0);
    elasticMock.count.mockResolvedValueOnce({ body: { count: 0 } });
    elasticMock.index.mockResolvedValueOnce({ body: { _id: "apply-from-pg" } });

    const response = await request(app)
      .get("/r/apply")
      .set("Host", "redirect.test")
      .set("Origin", "https://pg.example.com")
      .query({ view: "pg-click-123" });

    expect(response.status).toBe(200);
    expect(pgMock.statEvent.findUnique).toHaveBeenCalledWith({ where: { id: "pg-click-123" } });
    expect(pgMock.statEvent.count).toHaveBeenCalledWith({
      where: {
        type: "apply",
        click_id: "pg-click-123",
        created_at: { gte: expect.any(Date) },
      },
    });
    expect(pgMock.statEvent.create).toHaveBeenCalledTimes(1);
    const [[pgCreateArgs]] = pgMock.statEvent.create.mock.calls;
    expect(pgCreateArgs).toMatchObject({
      data: expect.objectContaining({
        id: expect.any(String),
        type: "apply",
        click_user: "click-user",
        click_id: "pg-click-123",
        user: identity.user,
      }),
    });

    expect(elasticMock.index).toHaveBeenCalledTimes(1);
    const [indexArgs] = elasticMock.index.mock.calls;
    expect(indexArgs[0].body).toMatchObject({
      type: "apply",
      user: identity.user,
      clickUser: "click-user",
      clickId: "pg-click-123",
      source: "campaign",
      sourceId: "campaign-id",
      sourceName: "Campaign Name",
      fromPublisherId: "source-publisher-id",
      fromPublisherName: "Source Publisher",
      toPublisherId: "to-publisher-id",
      toPublisherName: "To Publisher",
      missionId: "mission-id",
      missionClientId: "mission-client-id",
    });
  });

  it("records apply stats with custom attributes when provided", async () => {
    const identity = {
      user: "custom-identity-user",
      referer: "https://custom-referrer.example.com",
      userAgent: "Mozilla/5.0",
    };

    vi.spyOn(utils, "identify").mockReturnValue(identity);
    vi.spyOn(StatsBotModel, "findOne").mockResolvedValue(null);

    const clickStat = {
      user: "click-user",
      source: "publisher",
      sourceId: "source-id",
      sourceName: "Source Name",
      fromPublisherId: "source-publisher-id",
      fromPublisherName: "Source Publisher",
      toPublisherId: "to-publisher-id",
      toPublisherName: "To Publisher",
    };

    elasticMock.get.mockResolvedValueOnce({
      body: {
        _id: "click-789",
        _source: clickStat,
      },
    });

    const customAttributes = { candidateId: "candidate-123", metadata: { source: "asc" } };

    const response = await request(app)
      .get("/r/apply")
      .query({ view: "click-789", customAttributes: JSON.stringify(customAttributes) });

    expect(response.status).toBe(200);
    const [applyCall] = elasticMock.index.mock.calls.slice(-1);
    expect(applyCall[0].body).toMatchObject({
      customAttributes,
    });
  });

  it("returns 204 when custom attributes payload is invalid JSON", async () => {
    vi.spyOn(utils, "identify").mockReturnValue({
      user: "invalid-identity-user",
      referer: "https://invalid.example.com",
      userAgent: "Mozilla/5.0",
    });

    const response = await request(app)
      .get("/r/apply")
      .query({ view: "click-invalid", customAttributes: "{invalid" });

    expect(response.status).toBe(204);
    expect(elasticMock.get).not.toHaveBeenCalled();
    expect(elasticMock.index).not.toHaveBeenCalled();
  });
});
