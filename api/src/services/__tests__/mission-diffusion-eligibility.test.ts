import { PUBLISHER_IDS } from "@/config";
import { missionDiffusionEligibilityService } from "@/services/mission-diffusion-eligibility";
import { publisherService } from "@/services/publisher";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/publisher", () => ({
  publisherService: {
    hasDiffusionFromAnnonceur: vi.fn(),
  },
}));

const hasDiffusionFromAnnonceurMock = vi.mocked(publisherService.hasDiffusionFromAnnonceur);

describe("missionDiffusionEligibilityService.isEligible", () => {
  beforeEach(() => {
    hasDiffusionFromAnnonceurMock.mockReset();
    hasDiffusionFromAnnonceurMock.mockResolvedValue(true);
  });

  it("rend une mission éligible si son publisher est diffuseur autorisé par la Plateforme", async () => {
    await expect(
      missionDiffusionEligibilityService.isEligible({
        annonceurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: { publisherId: PUBLISHER_IDS.ROC },
      })
    ).resolves.toBe(true);

    expect(hasDiffusionFromAnnonceurMock).toHaveBeenCalledWith({
      annonceurPublisherId: PUBLISHER_IDS.PLATEFORM,
      diffuseurPublisherId: PUBLISHER_IDS.ROC,
    });
  });

  it("rend une mission inéligible si son publisher n'est pas diffuseur autorisé par la Plateforme", async () => {
    hasDiffusionFromAnnonceurMock.mockResolvedValueOnce(false);

    await expect(
      missionDiffusionEligibilityService.isEligible({
        annonceurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: { publisherId: "publisher-1" },
      })
    ).resolves.toBe(false);
  });

  it("rend une mission inéligible si elle n'a pas de publisher", async () => {
    await expect(
      missionDiffusionEligibilityService.isEligible({
        annonceurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: { publisherId: null },
      })
    ).resolves.toBe(false);

    expect(hasDiffusionFromAnnonceurMock).not.toHaveBeenCalled();
  });
});

describe("missionDiffusionEligibilityService.buildMissionDiffusionEligibilityWhere", () => {
  it("expose un filtre Prisma basé uniquement sur publisher_diffusion", () => {
    expect(missionDiffusionEligibilityService.buildMissionDiffusionEligibilityWhere(PUBLISHER_IDS.PLATEFORM)).toEqual({
      publisher: {
        diffusionsAsDiffuseur: {
          some: {
            annonceurPublisherId: PUBLISHER_IDS.PLATEFORM,
          },
        },
      },
    });
  });
});
