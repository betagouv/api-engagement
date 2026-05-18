import type { MissionBrowse, MissionDetailResponse } from "@engagement/dto";

import { PUBLISHER_IDS } from "@/config";
import type { MissionRecord } from "@/types/mission";
import { getMissionTrackedApplicationUrl } from "@/utils/mission";

export const toMissionBrowse = (mission: MissionRecord): MissionBrowse => {
  return {
    id: mission.id,
    title: mission.title,
    description: mission.description ?? null,
    city: mission.city ?? null,
    departmentCode: mission.departmentCode ?? null,
    departmentName: mission.departmentName ?? null,
    domain: mission.domain ?? null,
    domainOriginal: mission.domainOriginal ?? null,
    domainLogo: mission.domainLogo ?? null,
    photo: mission.domainLogo ?? mission.organizationLogo ?? mission.publisherLogo ?? null,
    organizationName: mission.organizationName ?? null,
    organizationLogo: mission.organizationLogo ?? null,
    publisherName: mission.publisherName ?? null,
    publisherLogo: mission.publisherLogo ?? null,
    applicationUrl: mission.applicationUrl ?? null,
    schedule: mission.schedule ?? null,
  };
};

export const toMissionDetailPayload = (mission: MissionRecord): MissionDetailResponse => {
  const addr = mission.addresses[0] ?? null;
  const addressParts = [addr?.street, addr?.postalCode && addr?.city ? `${addr.postalCode} ${addr.city}` : (addr?.city ?? null)].filter(Boolean);

  const hasCompensation = mission.compensationAmount != null || mission.compensationAmountMax != null;

  return {
    id: mission.id,
    title: mission.title,
    domain: mission.domain ?? mission.domainOriginal ?? null,
    domainLogo: mission.domainLogo ?? null,
    type: mission.type ?? null,
    publisherName: mission.publisherName ?? null,
    publisherLogo: mission.publisherLogo ?? null,
    organizationName: mission.organizationName ?? null,
    organizationLogo: mission.organizationLogo ?? null,
    location: addr
      ? {
          city: addr.city ?? null,
          address: addressParts.length > 0 ? addressParts.join(", ") : null,
          lat: addr.location?.lat ?? null,
          lon: addr.location?.lon ?? null,
        }
      : null,
    startAt: mission.startAt ? mission.startAt.toISOString() : null,
    endAt: mission.endAt ? mission.endAt.toISOString() : null,
    duration: mission.duration ?? null,
    schedule: mission.schedule ?? null,
    compensation: hasCompensation
      ? {
          amount: mission.compensationAmount ?? null,
          amountMax: mission.compensationAmountMax ?? null,
          unit: mission.compensationUnit ?? null,
          type: mission.compensationType ?? null,
        }
      : null,
    descriptionHtml: mission.descriptionHtml ?? null,
    description: mission.description ?? null,
    applicationUrl: getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.API_ENGAGEMENT),
    photo: mission.domainLogo ?? mission.organizationLogo ?? mission.publisherLogo ?? null,
    remote: mission.remote ?? null,
    openToMinors: mission.openToMinors ?? null,
    reducedMobilityAccessible: mission.reducedMobilityAccessible ?? null,
    places: mission.places ?? null,
  };
};
