import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/mission-enrichment", () => ({
  missionEnrichmentService: { enrich: vi.fn() },
}));

vi.mock("@/error", () => ({ captureException: vi.fn() }));

vi.mock("timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));

import { prisma } from "@/db/postgres";
import { UpdateMissionEnrichmentHandler, type UpdateMissionEnrichmentJobPayload } from "@/jobs/update-mission-enrichment/handler";
import { missionEnrichmentService } from "@/services/mission-enrichment";

const prismaMock = prisma as unknown as {
  mission: { findMany: ReturnType<typeof vi.fn> };
};

const enrichmentServiceMock = missionEnrichmentService as unknown as {
  enrich: ReturnType<typeof vi.fn>;
};

describe("UpdateMissionEnrichmentHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    prismaMock.mission.findMany.mockReset();
    enrichmentServiceMock.enrich.mockResolvedValue(undefined);
  });

  it("sélectionne et exécute les enrichissements avec la version explicite", async () => {
    prismaMock.mission.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "mission-1" }]);

    const result = await new UpdateMissionEnrichmentHandler().handle({ promptVersion: "v5" });

    expect(prismaMock.mission.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          enrichments: {
            some: {},
            none: { promptVersion: "v5", status: "completed" },
          },
        }),
      })
    );
    expect(enrichmentServiceMock.enrich).toHaveBeenCalledWith("mission-1", { force: false, promptVersion: "v5" });
    expect(result).toMatchObject({ success: true, processed: 1, failed: 0 });
    expect(result.message).toContain("version: v5");
  });

  it("refuse une version de prompt inconnue", async () => {
    const result = await new UpdateMissionEnrichmentHandler().handle({ promptVersion: "v999" as "v5" });

    expect(result).toMatchObject({ success: false, processed: 0, failed: 0 });
    expect(prismaMock.mission.findMany).not.toHaveBeenCalled();
    expect(enrichmentServiceMock.enrich).not.toHaveBeenCalled();
  });

  // Garde-fou contre l'opérateur `in` : une clé héritée du prototype ("toString", "__proto__") ne doit
  // pas être acceptée comme version valide (cf. `isPromptVersion` → `Object.hasOwn`).
  it.each(["toString", "__proto__", "constructor"])("refuse la propriété héritée %s", async (inheritedKey) => {
    const result = await new UpdateMissionEnrichmentHandler().handle({ promptVersion: inheritedKey } as UpdateMissionEnrichmentJobPayload);

    expect(result).toMatchObject({ success: false, processed: 0, failed: 0 });
    expect(prismaMock.mission.findMany).not.toHaveBeenCalled();
    expect(enrichmentServiceMock.enrich).not.toHaveBeenCalled();
  });
});
