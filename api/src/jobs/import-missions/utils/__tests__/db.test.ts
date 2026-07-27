import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, updateMock, enqueueDiffusionMock, getMissionChangesMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  enqueueDiffusionMock: vi.fn(),
  getMissionChangesMock: vi.fn(),
}));

vi.mock("@/services/mission", () => ({
  missionService: { create: createMock, update: updateMock, enqueueMissionDiffusion: enqueueDiffusionMock },
}));
vi.mock("@/services/publisher-organization", () => ({ default: {} }));
vi.mock("@/utils/mission", () => ({ getMissionChanges: getMissionChangesMock }));
vi.mock("@/utils/publisher-organization", () => ({ getPublisherOrganizationChanges: vi.fn() }));
vi.mock("@/utils/job", () => ({ getJobTime: vi.fn() }));

import { upsertMission } from "@/jobs/import-missions/utils/db";

const existingMission = { id: "mission-1" } as never;
const input = { clientId: "c-1" } as never;

describe("upsertMission — re-diffusion sur changement de l'organisation liée", () => {
  beforeEach(() => {
    createMock.mockReset();
    updateMock.mockReset().mockResolvedValue(existingMission);
    enqueueDiffusionMock.mockReset().mockResolvedValue(undefined);
    getMissionChangesMock.mockReset();
  });

  it("mission inchangée mais organisation liée modifiée → enqueue la diffusion sans réécrire la mission", async () => {
    getMissionChangesMock.mockReturnValue(null);

    const result = await upsertMission(input, existingMission, { relatedDiffusionDataChanged: true });

    expect(result.action).toBe("unchanged");
    expect(updateMock).not.toHaveBeenCalled();
    expect(enqueueDiffusionMock).toHaveBeenCalledWith("mission-1");
  });

  it("mission inchangée et organisation liée inchangée → aucun effet de bord", async () => {
    getMissionChangesMock.mockReturnValue(null);

    const result = await upsertMission(input, existingMission, { relatedDiffusionDataChanged: false });

    expect(result.action).toBe("unchanged");
    expect(updateMock).not.toHaveBeenCalled();
    expect(enqueueDiffusionMock).not.toHaveBeenCalled();
  });

  it("mission modifiée → propage relatedDiffusionDataChanged au service (pas d'enqueue direct)", async () => {
    getMissionChangesMock.mockReturnValue({ places: { previous: 1, current: 2 } });

    const result = await upsertMission(input, existingMission, { relatedDiffusionDataChanged: true });

    expect(result.action).toBe("updated");
    expect(updateMock).toHaveBeenCalledWith("mission-1", input, { relatedDiffusionDataChanged: true });
    expect(enqueueDiffusionMock).not.toHaveBeenCalled();
  });
});
