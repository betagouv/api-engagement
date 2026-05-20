import { Prisma } from "@/db/core";
import { publisherService } from "@/services/publisher";

type MissionDiffusionEligibilityInput = {
  publisherId?: string | null;
};

type IsEligibleParams = {
  mission: MissionDiffusionEligibilityInput;
  annonceurPublisherId: string;
};

export const missionDiffusionEligibilityService = {
  async isEligible({ mission, annonceurPublisherId }: IsEligibleParams): Promise<boolean> {
    if (!mission.publisherId) {
      return false;
    }

    return publisherService.hasDiffusionFromAnnonceur({
      annonceurPublisherId,
      diffuseurPublisherId: mission.publisherId,
    });
  },

  buildMissionDiffusionEligibilityWhere(annonceurPublisherId: string): Prisma.MissionWhereInput {
    return {
      publisher: {
        diffusionsAsDiffuseur: {
          some: {
            annonceurPublisherId,
          },
        },
      },
    };
  },
};
