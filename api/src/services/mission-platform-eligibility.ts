import { PUBLISHER_IDS } from "@/config";
import { MissionType, Prisma } from "@/db/core";

type MissionPlatformEligibilityInput = {
  publisherId?: string | null;
  type?: MissionType | null;
};

const ELIGIBLE_MISSION_TYPES: MissionType[] = [MissionType.volontariat_sapeurs_pompiers];
const ELIGIBLE_PUBLISHER_IDS: string[] = [PUBLISHER_IDS.ROC, PUBLISHER_IDS.JEVEUXAIDER, PUBLISHER_IDS.SERVICE_CIVIQUE];

export const isMissionEligibleForPlatform = (mission: MissionPlatformEligibilityInput): boolean => {
  if (mission.type && ELIGIBLE_MISSION_TYPES.includes(mission.type)) {
    return true;
  }

  if (mission.publisherId && ELIGIBLE_PUBLISHER_IDS.includes(mission.publisherId)) {
    return true;
  }

  return false;
};

export const buildMissionPlatformEligibilityWhere = (): Prisma.MissionWhereInput => ({
  OR: [{ type: { in: ELIGIBLE_MISSION_TYPES } }, { publisherId: { in: ELIGIBLE_PUBLISHER_IDS } }],
});
