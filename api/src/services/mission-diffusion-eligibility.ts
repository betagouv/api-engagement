import { PUBLISHER_IDS } from "@/config";
import { MissionType, Prisma } from "@/db/core";
import { publisherDiffusionExclusionService } from "@/services/publisher-diffusion-exclusion";

type MissionDiffusionEligibilityInput = {
  publisherId?: string | null;
  publisherOrganizationId?: string | null;
  type?: MissionType | null;
};

type IsEligibleParams = {
  mission: MissionDiffusionEligibilityInput;
  diffuseurPublisherId: string;
};

const PLATEFORM_ELIGIBLE_MISSION_TYPES: MissionType[] = [MissionType.volontariat_sapeurs_pompiers];
const PLATEFORM_ELIGIBLE_PUBLISHER_IDS: string[] = [PUBLISHER_IDS.ROC, PUBLISHER_IDS.JEVEUXAIDER, PUBLISHER_IDS.SERVICE_CIVIQUE];

const isIncludedForDiffuseur = (mission: MissionDiffusionEligibilityInput, diffuseurPublisherId: string): boolean => {
  if (diffuseurPublisherId !== PUBLISHER_IDS.PLATEFORM) {
    return true;
  }

  if (mission.type && PLATEFORM_ELIGIBLE_MISSION_TYPES.includes(mission.type)) {
    return true;
  }

  if (mission.publisherId && PLATEFORM_ELIGIBLE_PUBLISHER_IDS.includes(mission.publisherId)) {
    return true;
  }

  return false;
};

const buildInclusionWhere = (diffuseurPublisherId: string): Prisma.MissionWhereInput => {
  if (diffuseurPublisherId !== PUBLISHER_IDS.PLATEFORM) {
    return {};
  }

  return {
    OR: [{ type: { in: PLATEFORM_ELIGIBLE_MISSION_TYPES } }, { publisherId: { in: PLATEFORM_ELIGIBLE_PUBLISHER_IDS } }],
  };
};

export const missionDiffusionEligibilityService = {
  async isEligible({ mission, diffuseurPublisherId }: IsEligibleParams): Promise<boolean> {
    if (!isIncludedForDiffuseur(mission, diffuseurPublisherId)) {
      return false;
    }

    if (!mission.publisherId || !mission.publisherOrganizationId) {
      return true;
    }

    const hasExclusion = await publisherDiffusionExclusionService.hasExclusionForMissionDiffusion({
      excludedByAnnonceurId: mission.publisherId,
      excludedForDiffuseurId: diffuseurPublisherId,
      publisherOrganizationId: mission.publisherOrganizationId,
    });

    return !hasExclusion;
  },

  buildMissionDiffusionEligibilityWhere(diffuseurPublisherId: string): Prisma.MissionWhereInput {
    return {
      AND: [
        buildInclusionWhere(diffuseurPublisherId),
        {
          OR: [
            { publisherOrganizationId: null },
            {
              publisherOrganization: {
                publisherDiffusionExclusions: {
                  none: {
                    excludedForDiffuseurId: diffuseurPublisherId,
                  },
                },
              },
            },
          ],
        },
      ],
    };
  },
};
