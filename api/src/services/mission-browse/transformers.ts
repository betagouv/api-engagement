import type { MissionBrowse, MissionDetailResponse } from "@engagement/dto";

import type { MissionAddress, MissionRecord } from "@/types/mission";
import { getDistanceFromLatLonInKm } from "@/utils/geo";
import { getMissionTrackedApplicationUrl } from "@/utils/mission";

// Avec un point de référence, l'adresse retenue est la plus proche (ex. la caserne la plus proche d'un SDIS).
const findNearestAddress = (addresses: MissionAddress[], lat: number, lon: number): MissionAddress | undefined => {
  let nearestAddress = addresses[0];
  let nearestDistance = Infinity;
  for (const address of addresses) {
    const distance = getDistanceFromLatLonInKm(lat, lon, address.location?.lat, address.location?.lon);
    if (distance !== undefined && distance < nearestDistance) {
      nearestAddress = address;
      nearestDistance = distance;
    }
  }
  return nearestAddress;
};

export const toMissionBrowse = (mission: MissionRecord, point?: { lat?: number; lon?: number }): MissionBrowse => {
  const hasCompensation = mission.compensationAmount != null || mission.compensationAmountMax != null;
  const primaryAddress = point?.lat !== undefined && point.lon !== undefined ? findNearestAddress(mission.addresses, point.lat, point.lon) : mission.addresses[0];

  return {
    id: mission.id,
    addressId: primaryAddress?.id ?? null,
    title: mission.title,
    description: mission.description ?? null,
    remote: mission.remote ?? null,
    city: primaryAddress?.city ?? null,
    country: primaryAddress?.country ?? null,
    departmentCode: mission.departmentCode ?? null,
    departmentName: mission.departmentName ?? null,
    domain: mission.domain ?? null,
    domainOriginal: mission.domainOriginal ?? null,
    domainLogo: mission.domainLogo ?? null,
    photo: mission.domainLogo ?? mission.organizationLogo ?? mission.publisherLogo ?? null,
    organizationName: mission.organizationName ?? null,
    organizationLogo: mission.organizationLogo ?? null,
    publisherId: mission.publisherId ?? null,
    publisherName: mission.publisherName ?? null,
    publisherLogo: mission.publisherLogo ?? null,
    applicationUrl: mission.applicationUrl ?? null,
    schedule: mission.schedule ?? null,
    places: mission.places ?? null,
    tags: mission.tags,
    addresses: mission.addresses.map((address) => ({
      city: address.city ?? null,
      country: address.country ?? null,
      location: address.location ?? null,
    })),
    compensation: hasCompensation
      ? {
          amount: mission.compensationAmount ?? null,
          amountMax: mission.compensationAmountMax ?? null,
          unit: mission.compensationUnit ?? null,
          type: mission.compensationType ?? null,
        }
      : null,
  };
};

export const toMissionDetailPayload = (mission: MissionRecord, diffuseurPublisherId: string, addressId?: string | null): MissionDetailResponse => {
  const addr = (addressId ? mission.addresses.find((a) => a.id === addressId) : null) ?? mission.addresses[0] ?? null;
  const addressParts = [addr?.street, addr?.postalCode && addr?.city ? `${addr.postalCode} ${addr.city}` : (addr?.city ?? null)].filter(Boolean);

  const hasCompensation = mission.compensationAmount != null || mission.compensationAmountMax != null;

  return {
    id: mission.id,
    title: mission.title,
    domain: mission.domain ?? mission.domainOriginal ?? null,
    domainLogo: mission.domainLogo ?? null,
    type: mission.type ?? null,
    publisherId: mission.publisherId ?? null,
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
    applicationUrl: getMissionTrackedApplicationUrl(mission, diffuseurPublisherId),
    photo: mission.domainLogo ?? mission.organizationLogo ?? mission.publisherLogo ?? null,
    remote: mission.remote ?? null,
    openToMinors: mission.openToMinors ?? null,
    reducedMobilityAccessible: mission.reducedMobilityAccessible ?? null,
    places: mission.places ?? null,
  };
};
