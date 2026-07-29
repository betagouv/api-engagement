import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const browseMock = vi.hoisted(() => vi.fn());
const buildWidgetBaseFilterMock = vi.hoisted(() => vi.fn());
const MissionBrowseIndexUnavailableErrorMock = vi.hoisted(() => class MissionBrowseIndexUnavailableError extends Error {});

vi.mock("@/services/mission-browse", () => ({
  MissionBrowseIndexUnavailableError: MissionBrowseIndexUnavailableErrorMock,
  missionBrowseService: {
    browse: browseMock,
    findById: vi.fn(),
  },
}));

vi.mock("@/services/mission-browse/widget-filters", () => ({
  buildWidgetBaseFilter: buildWidgetBaseFilterMock,
}));

import { BENEVOLAT_URL, PUBLISHER_IDS } from "@/config";
import { createTestPublisher, createTestWidget } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("GET /missions/browse", () => {
  beforeEach(() => {
    browseMock.mockReset();
    browseMock.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, facets: {} });
  });

  it("exige une authentification", async () => {
    await request(app).get("/missions/browse").expect(401);
    expect(browseMock).not.toHaveBeenCalled();
  });

  it("dérive le diffuseur de la clé API", async () => {
    const publisher = await createTestPublisher();

    await request(app).get("/missions/browse").set("x-api-key", publisher.apikey!).expect(200);

    expect(browseMock).toHaveBeenCalledWith(expect.objectContaining({ diffuseurPublisherId: publisher.id, page: 1, pageSize: 20 }));
  });

  it("retourne 503 lorsque Typesense est indisponible", async () => {
    const publisher = await createTestPublisher();
    browseMock.mockRejectedValue(new MissionBrowseIndexUnavailableErrorMock());

    await request(app).get("/missions/browse").set("x-api-key", publisher.apikey!).expect(503);
  });
});

describe("GET /missions/browse/widget/:id", () => {
  beforeEach(() => {
    browseMock.mockReset();
    buildWidgetBaseFilterMock.mockReset();
    browseMock.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 25, facets: {} });
    buildWidgetBaseFilterMock.mockResolvedValue("widget-filter");
  });

  it("recherche avec la configuration du widget", async () => {
    const publisher = await createTestPublisher();
    const widget = await createTestWidget({
      fromPublisher: publisher,
      publishers: [publisher.id],
      jvaModeration: true,
    });

    const response = await request(app).get(`/missions/browse/widget/${widget.id}`).query({ search: "solidarité", remote: "yes", from: 10, size: 25 }).expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      data: [],
      total: 0,
      page: 1,
      pageSize: 25,
      facets: {},
      request: expect.any(String),
    });
    expect(buildWidgetBaseFilterMock).toHaveBeenCalledWith(expect.objectContaining({ id: widget.id }));
    expect(browseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "solidarité",
        remote: ["full", "possible"],
        diffuseurPublisherId: publisher.id,
        baseFilterBy: "widget-filter",
        widgetMode: true,
        moderatedBy: PUBLISHER_IDS.JEVEUXAIDER,
        offset: 10,
        page: 1,
        pageSize: 25,
      })
    );
  });

  it("n'expose pas un widget inactif", async () => {
    const widget = await createTestWidget({ active: false });

    await request(app).get(`/missions/browse/widget/${widget.id}`).expect(404);

    expect(buildWidgetBaseFilterMock).not.toHaveBeenCalled();
    expect(browseMock).not.toHaveBeenCalled();
  });

  it("valide les paramètres de recherche", async () => {
    const widget = await createTestWidget();

    await request(app).get(`/missions/browse/widget/${widget.id}`).query({ lat: 100 }).expect(400);
    await request(app).get(`/missions/browse/widget/${widget.id}`).query({ size: 0 }).expect(400);

    expect(browseMock).not.toHaveBeenCalled();
  });

  it("autorise uniquement les origines du widget", async () => {
    const widget = await createTestWidget();

    const allowed = await request(app).get(`/missions/browse/widget/${widget.id}`).set("Origin", BENEVOLAT_URL).expect(200);
    const denied = await request(app).get(`/missions/browse/widget/${widget.id}`).set("Origin", "https://example.com").expect(200);

    expect(allowed.headers["access-control-allow-origin"]).toBe(BENEVOLAT_URL);
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("retourne 503 lorsque Typesense est indisponible", async () => {
    const widget = await createTestWidget();
    browseMock.mockRejectedValue(new MissionBrowseIndexUnavailableErrorMock());

    await request(app).get(`/missions/browse/widget/${widget.id}`).expect(503);
  });
});
