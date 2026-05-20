import { PUBLISHER_IDS } from "@/config";
import { MissionType } from "@/db/core";
import { missionDiffusionEligibilityService } from "@/services/mission-diffusion-eligibility";
import { publisherDiffusionExclusionService } from "@/services/publisher-diffusion-exclusion";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/publisher-diffusion-exclusion", () => ({
  publisherDiffusionExclusionService: {
    hasExclusionForMissionDiffusion: vi.fn(),
  },
}));

const hasExclusionForMissionDiffusionMock = vi.mocked(publisherDiffusionExclusionService.hasExclusionForMissionDiffusion);

describe("missionDiffusionEligibilityService.isEligible", () => {
  beforeEach(() => {
    hasExclusionForMissionDiffusionMock.mockResolvedValue(false);
  });

  it("rend les missions sapeurs-pompiers éligibles pour la Plateforme", async () => {
    await expect(
      missionDiffusionEligibilityService.isEligible({
        diffuseurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: { publisherId: "publisher-1", publisherOrganizationId: "organization-1", type: MissionType.volontariat_sapeurs_pompiers },
      })
    ).resolves.toBe(true);
  });

  it("rend les missions ROC, JeVeuxAider et Service Civique éligibles pour la Plateforme", async () => {
    await expect(
      missionDiffusionEligibilityService.isEligible({
        diffuseurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: { publisherId: PUBLISHER_IDS.ROC, publisherOrganizationId: "organization-1", type: MissionType.benevolat },
      })
    ).resolves.toBe(true);

    await expect(
      missionDiffusionEligibilityService.isEligible({
        diffuseurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: { publisherId: PUBLISHER_IDS.JEVEUXAIDER, publisherOrganizationId: "organization-2", type: MissionType.benevolat },
      })
    ).resolves.toBe(true);

    await expect(
      missionDiffusionEligibilityService.isEligible({
        diffuseurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: {
          publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE,
          publisherOrganizationId: "organization-3",
          type: MissionType.volontariat_service_civique,
        },
      })
    ).resolves.toBe(true);
  });

  it("rend une mission inéligible pour la Plateforme si aucune règle d'inclusion ne correspond", async () => {
    await expect(
      missionDiffusionEligibilityService.isEligible({
        diffuseurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: { publisherId: "publisher-1", publisherOrganizationId: "organization-1", type: MissionType.benevolat },
      })
    ).resolves.toBe(false);

    expect(hasExclusionForMissionDiffusionMock).not.toHaveBeenCalled();
  });

  it("rend une mission inéligible si son organisation est exclue pour le diffuseur", async () => {
    hasExclusionForMissionDiffusionMock.mockResolvedValueOnce(true);

    await expect(
      missionDiffusionEligibilityService.isEligible({
        diffuseurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: { publisherId: PUBLISHER_IDS.JEVEUXAIDER, publisherOrganizationId: "organization-1", type: MissionType.benevolat },
      })
    ).resolves.toBe(false);

    expect(hasExclusionForMissionDiffusionMock).toHaveBeenCalledWith({
      excludedByAnnonceurId: PUBLISHER_IDS.JEVEUXAIDER,
      excludedForDiffuseurId: PUBLISHER_IDS.PLATEFORM,
      publisherOrganizationId: "organization-1",
    });
  });

  it("ne déclenche pas d'exclusion organisationnelle sans publisherOrganizationId", async () => {
    await expect(
      missionDiffusionEligibilityService.isEligible({
        diffuseurPublisherId: PUBLISHER_IDS.PLATEFORM,
        mission: { publisherId: PUBLISHER_IDS.JEVEUXAIDER, publisherOrganizationId: null, type: MissionType.benevolat },
      })
    ).resolves.toBe(true);

    expect(hasExclusionForMissionDiffusionMock).not.toHaveBeenCalled();
  });

  it("n'applique pas d'allowlist pour les diffuseurs non-Plateforme", async () => {
    await expect(
      missionDiffusionEligibilityService.isEligible({
        diffuseurPublisherId: PUBLISHER_IDS.LETUDIANT,
        mission: { publisherId: "publisher-1", publisherOrganizationId: "organization-1", type: MissionType.benevolat },
      })
    ).resolves.toBe(true);

    expect(hasExclusionForMissionDiffusionMock).toHaveBeenCalledWith({
      excludedByAnnonceurId: "publisher-1",
      excludedForDiffuseurId: PUBLISHER_IDS.LETUDIANT,
      publisherOrganizationId: "organization-1",
    });
  });
});

describe("missionDiffusionEligibilityService.buildMissionDiffusionEligibilityWhere", () => {
  it("expose le filtre Prisma d'inclusion et d'exclusion pour la Plateforme", () => {
    expect(missionDiffusionEligibilityService.buildMissionDiffusionEligibilityWhere(PUBLISHER_IDS.PLATEFORM)).toEqual({
      AND: [
        {
          OR: [
            { type: { in: [MissionType.volontariat_sapeurs_pompiers] } },
            { publisherId: { in: [PUBLISHER_IDS.ROC, PUBLISHER_IDS.JEVEUXAIDER, PUBLISHER_IDS.SERVICE_CIVIQUE] } },
          ],
        },
        {
          OR: [
            { publisherOrganizationId: null },
            {
              publisherOrganization: {
                publisherDiffusionExclusions: {
                  none: {
                    excludedForDiffuseurId: PUBLISHER_IDS.PLATEFORM,
                  },
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("expose uniquement le filtre d'exclusion pour les diffuseurs non-Plateforme", () => {
    expect(missionDiffusionEligibilityService.buildMissionDiffusionEligibilityWhere(PUBLISHER_IDS.LETUDIANT)).toEqual({
      AND: [
        {},
        {
          OR: [
            { publisherOrganizationId: null },
            {
              publisherOrganization: {
                publisherDiffusionExclusions: {
                  none: {
                    excludedForDiffuseurId: PUBLISHER_IDS.LETUDIANT,
                  },
                },
              },
            },
          ],
        },
      ],
    });
  });
});
