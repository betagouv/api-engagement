import { MissionType } from "@/db/core";
import { PUBLISHER_IDS } from "@/config";
import { buildMissionPlatformEligibilityWhere, isMissionEligibleForPlatform } from "@/services/mission-platform-eligibility";
import { describe, expect, it } from "vitest";

describe("isMissionEligibleForPlatform", () => {
  it("rend les missions inéligibles par défaut", () => {
    expect(isMissionEligibleForPlatform({ publisherId: "publisher-1", type: null })).toBe(false);
    expect(isMissionEligibleForPlatform({ publisherId: "publisher-1", type: MissionType.benevolat })).toBe(false);
    expect(isMissionEligibleForPlatform({ publisherId: "publisher-1", type: MissionType.volontariat_service_civique })).toBe(false);
    expect(isMissionEligibleForPlatform({ publisherId: "publisher-1", type: MissionType.volontariat_reserve_operationnelle })).toBe(false);
  });

  it("rend les missions sapeurs-pompiers éligibles", () => {
    expect(isMissionEligibleForPlatform({ publisherId: "publisher-1", type: MissionType.volontariat_sapeurs_pompiers })).toBe(true);
  });

  it("rend les missions ROC, JeVeuxAider et Service Civique éligibles", () => {
    expect(isMissionEligibleForPlatform({ publisherId: PUBLISHER_IDS.ROC, type: MissionType.benevolat })).toBe(true);
    expect(isMissionEligibleForPlatform({ publisherId: PUBLISHER_IDS.JEVEUXAIDER, type: MissionType.benevolat })).toBe(true);
    expect(isMissionEligibleForPlatform({ publisherId: PUBLISHER_IDS.SERVICE_CIVIQUE, type: MissionType.volontariat_service_civique })).toBe(true);
  });
});

describe("buildMissionPlatformEligibilityWhere", () => {
  it("expose un filtre Prisma équivalent au prédicat", () => {
    expect(buildMissionPlatformEligibilityWhere()).toEqual({
      OR: [
        { type: { in: [MissionType.volontariat_sapeurs_pompiers] } },
        { publisherId: { in: [PUBLISHER_IDS.ROC, PUBLISHER_IDS.JEVEUXAIDER, PUBLISHER_IDS.SERVICE_CIVIQUE] } },
      ],
    });
  });
});
