import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const browseMock = vi.hoisted(() => vi.fn());
const MissionBrowseIndexUnavailableErrorMock = vi.hoisted(() => class MissionBrowseIndexUnavailableError extends Error {});

vi.mock("@/services/mission-browse", () => ({
  MissionBrowseIndexUnavailableError: MissionBrowseIndexUnavailableErrorMock,
  missionBrowseService: {
    browse: browseMock,
    findById: vi.fn(),
  },
}));

import { createTestPublisher } from "../../../fixtures";
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
