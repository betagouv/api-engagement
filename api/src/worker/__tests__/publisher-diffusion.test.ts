import { describe, expect, it, vi } from "vitest";

const handleMock = vi.fn();

vi.mock("@/jobs/mission-diffusion-rebuild/handler", () => ({
  // Implémentation en `function` (pas une arrow function) : handlePublisherDiffusion instancie cette
  // classe via `new`, et une arrow function ne peut pas servir de constructeur.
  MissionDiffusionRebuildHandler: vi.fn().mockImplementation(function () {
    return { handle: handleMock };
  }),
}));

import { handlePublisherDiffusion } from "@/worker/handlers/publisher-diffusion";

describe("publisher diffusion worker", () => {
  it("delegates the scoped rebuild to MissionDiffusionRebuildHandler for the given publisher", async () => {
    handleMock.mockResolvedValue({ success: true, timestamp: new Date(), added: 3, removed: 1 });

    await handlePublisherDiffusion({ publisherId: "publisher-1" });

    expect(handleMock).toHaveBeenCalledWith({ publisherId: "publisher-1" });
  });

  it("re-throws errors from the rebuild handler", async () => {
    const error = new Error("rebuild failed");
    handleMock.mockRejectedValue(error);

    await expect(handlePublisherDiffusion({ publisherId: "publisher-1" })).rejects.toThrow("rebuild failed");
  });
});
