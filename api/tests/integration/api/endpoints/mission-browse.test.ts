import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const browseMock = vi.hoisted(() => vi.fn());
const buildWidgetBaseFilterMock = vi.hoisted(() => vi.fn());
const MissionBrowseIndexUnavailableErrorMock = vi.hoisted(
  () =>
    class MissionBrowseIndexUnavailableError extends Error {}
);

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

import { createTestPublisher, createTestWidget } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("GET /missions/browse", () => {
  beforeEach(() => {
    browseMock.mockReset();
    buildWidgetBaseFilterMock.mockReset();
    buildWidgetBaseFilterMock.mockResolvedValue("widget-filter");
    browseMock.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, facets: {} });
  });

  it("exige une authentification ou un contexte widget", async () => {
    await request(app).get("/missions/browse").expect(401);
    expect(browseMock).not.toHaveBeenCalled();
  });

  it("dérive le diffuseur depuis un widget public actif", async () => {
    const publisher = await createTestPublisher();
    const widget = await createTestWidget({ fromPublisher: publisher, publishers: [publisher.id] });

    const response = await request(app).get("/missions/browse").query({ widgetId: widget.id, pageSize: 6, page: 2 }).expect(200);

    expect(response.body.ok).toBe(true);
    expect(buildWidgetBaseFilterMock).toHaveBeenCalledWith(expect.objectContaining({ id: widget.id }));
    expect(browseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        diffuseurPublisherId: publisher.id,
        baseFilterBy: "widget-filter",
        widgetMode: true,
        page: 2,
        pageSize: 6,
      })
    );
  });

  it("refuse un widget inactif", async () => {
    const widget = await createTestWidget({ active: false });

    await request(app).get("/missions/browse").query({ widgetId: widget.id }).expect(404);
    expect(browseMock).not.toHaveBeenCalled();
  });

  it("conserve le mode intégrateur authentifié", async () => {
    const publisher = await createTestPublisher();

    await request(app).get("/missions/browse").set("x-api-key", publisher.apikey!).expect(200);

    expect(browseMock).toHaveBeenCalledWith(expect.objectContaining({ diffuseurPublisherId: publisher.id, page: 1, pageSize: 20 }));
  });

  it("refuse de faire confiance à un fromPublisherId client", async () => {
    const widget = await createTestWidget();

    await request(app).get("/missions/browse").query({ widgetId: widget.id, fromPublisherId: "other-publisher" }).expect(400);
    expect(browseMock).not.toHaveBeenCalled();
  });

  it("refuse de remplacer les publishers configurés sur le widget", async () => {
    const widget = await createTestWidget();

    await request(app).get("/missions/browse").query({ widgetId: widget.id, publisherId: "other-publisher" }).expect(400);
    expect(browseMock).not.toHaveBeenCalled();
  });

  it("retourne 503 lorsque Typesense est indisponible", async () => {
    const widget = await createTestWidget();
    browseMock.mockRejectedValue(new MissionBrowseIndexUnavailableErrorMock());

    await request(app).get("/missions/browse").query({ widgetId: widget.id }).expect(503);
  });
});
