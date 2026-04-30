import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/mission-enrichment", () => ({
  missionEnrichmentService: {
    enrich: vi.fn(),
  },
}));

import { missionEnrichmentService } from "@/services/mission-enrichment";
import { handleMissionEnrichment } from "@/worker/handlers/mission-enrichment";

const missionEnrichmentServiceMock = missionEnrichmentService as unknown as {
  enrich: ReturnType<typeof vi.fn>;
};

describe("mission enrichment worker", () => {
  it("forwards the payload to the enrichment service", async () => {
    missionEnrichmentServiceMock.enrich.mockResolvedValue(undefined);

    await handleMissionEnrichment({ missionId: "mission-1" });

    expect(missionEnrichmentServiceMock.enrich).toHaveBeenCalledWith("mission-1", { force: undefined });
  });

  it("forwards the force option", async () => {
    missionEnrichmentServiceMock.enrich.mockResolvedValue(undefined);

    await handleMissionEnrichment({ missionId: "mission-1", force: true });

    expect(missionEnrichmentServiceMock.enrich).toHaveBeenCalledWith("mission-1", { force: true });
  });
});
