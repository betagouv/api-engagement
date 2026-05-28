import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/mission-enrichment", () => ({
  missionEnrichmentService: {
    enrich: vi.fn(),
  },
}));

import { missionEnrichmentService } from "@/services/mission-enrichment";
import { MissionEnrichmentRateLimitError } from "@/services/mission-enrichment/errors";
import { WorkerRetryableError } from "@/worker/errors";
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

  it("throws WorkerRetryableError with missionId when service throws MissionEnrichmentRateLimitError", async () => {
    missionEnrichmentServiceMock.enrich.mockRejectedValue(new MissionEnrichmentRateLimitError());

    await expect(handleMissionEnrichment({ missionId: "mission-1" })).rejects.toThrow(WorkerRetryableError);
    await expect(handleMissionEnrichment({ missionId: "mission-1" })).rejects.toThrow("rate_limit missionId=mission-1");
  });

  it("swallows AI_NoObjectGeneratedError without throwing", async () => {
    const error = Object.assign(new Error("no object"), { name: "AI_NoObjectGeneratedError" });
    missionEnrichmentServiceMock.enrich.mockRejectedValue(error);

    await expect(handleMissionEnrichment({ missionId: "mission-1" })).resolves.toBeUndefined();
  });

  it("re-throws unknown errors", async () => {
    const error = new Error("unexpected failure");
    missionEnrichmentServiceMock.enrich.mockRejectedValue(error);

    await expect(handleMissionEnrichment({ missionId: "mission-1" })).rejects.toThrow("unexpected failure");
  });
});
