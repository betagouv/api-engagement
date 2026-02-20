import { CompensationType, CompensationUnit } from "../../constants/compensation";
import type { MissionRecord } from "../../types/mission";
import { PublisherOrganizationRecord } from "../../types/publisher-organization";

export interface MissionXML {
  id: string;
  title: string;
  description: string;
  image: string;
  clientId: string;
  applicationUrl: string;
  postedAt: string;
  startAt: string;
  endAt: string;
  country: string;
  countryCode: string; // Partner makes errors but we save them cause we're cool
  address: string;
  adresse: string; // Partner makes errors but we save them cause we're cool
  city: string;
  postalCode: string;
  departmentCode: string;
  departmentName: string;
  region: string;
  lonlat: string | undefined; // Old
  lonLat: string | undefined; // Partner makes errors but we save them cause we're cool
  location:
    | {
        lon: number;
        lat: number;
      }
    | undefined;

  addresses: {
    street: string;
    city: string;
    postalCode: string;
    departmentName: string;
    departmentCode: string;
    region: string;
    country: string;
    location:
      | {
          lon: number;
          lat: number;
        }
      | undefined;
  }[];

  activity: string;
  tags: { value: string[] | string } | string;
  domain: string;
  schedule: string;
  audience: { value: string[] | string } | string;
  soft_skills: { value: string[] | string } | string;
  softSkills: { value: string[] | string } | string;
  romeSkills: { value: string[] | string } | string;
  requirements: { value: string[] | string } | string;
  remote: "no" | "possible" | "full";
  reducedMobilityAccessible: string;
  closeToTransport: string;
  openToMinors: string;
  priority: string;
  metadata: string;
  places: number | string;

  compensationAmount?: number | string;
  compensationUnit?: CompensationUnit | string;
  compensationType?: CompensationType | string;

  organizationName: string;
  organizationRNA: string;
  organizationRna: string; // Partner makes errors but we save them cause we're cool
  organizationSiren: string;
  organizationUrl: string;
  organizationLogo?: string;
  organizationDescription: string;
  organizationClientId: string;
  organizationStatusJuridique: string;
  organizationType: string;
  organizationActions: string[];
  organizationId: string;
  organizationFullAddress: string;
  organizationPostCode: string;
  organizationCity: string;
  organizationBeneficiaires: string; // Maybe an error in the doc
  organizationBeneficiaries: string;
  organizationReseaux: { value: string[] | string } | string;

  // Out of the doc
  publicsBeneficiaires: { value: string[] | string } | string;
  publicBeneficiaries: { value: string[] | string } | string;
  snu: "yes" | "no";
  snuPlaces: number | string | undefined;
  keyActions: string | undefined;
  isAutonomy: "yes" | "no" | undefined;
  autonomyZips:
    | {
        item: {
          zip: string;
          city: string;
          latitude: string;
          longitude: string;
        }[];
      }
    | undefined;
  parentOrganizationName: string;
}

export type ImportedMission = MissionRecord & {
  organizationClientId: string | null;
  geolocStatus?: string | null;
  deleted?: boolean;
};

export type ImportedOrganization = Omit<PublisherOrganizationRecord, "id" | "createdAt" | "updatedAt">;
