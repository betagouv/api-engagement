import { ModerationEventStatus } from "@/db/core";
import { MissionRecord } from "@/types/mission";
import { OrganizationRecord } from "@/types/organization";
import { PublisherRecord } from "@/types/publisher";
import { PublisherOrganizationRecord } from "@/types/publisher-organization";

export type MissionModerationSearchFilters = {
  publisherId: PublisherRecord["id"];
};

export type MissionModerationRecord = {
  id: string;
  status: ModerationEventStatus | null;
  comment: string | null;
  note: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;

  missionId: MissionRecord["id"];
  missionDomain: MissionRecord["domain"];
  missionClientId: MissionRecord["clientId"];
  missionTitle: MissionRecord["title"];
  missionDescription: MissionRecord["description"];
  missionApplicationUrl: MissionRecord["applicationUrl"];

  missionStartAt: MissionRecord["startAt"];
  missionEndAt: MissionRecord["endAt"];
  missionPostedAt: MissionRecord["postedAt"];
  missionCity: MissionRecord["city"];
  missionDepartmentCode: MissionRecord["departmentCode"];
  missionDepartmentName: MissionRecord["departmentName"];

  missionPostalCode: MissionRecord["postalCode"];
  missionPublisherId: MissionRecord["publisherId"];
  missionPublisherName: MissionRecord["publisherName"];

  missionPublisherOrganizationId: PublisherOrganizationRecord["id"] | null;
  missionOrganizationName: PublisherOrganizationRecord["name"] | null;
  missionOrganizationClientId: PublisherOrganizationRecord["clientId"] | null;
  missionOrganizationSiren: PublisherOrganizationRecord["siren"] | null;
  missionOrganizationRNA: PublisherOrganizationRecord["rna"] | null;
  missionOrganizationSirenVerified: OrganizationRecord["siren"] | null;
  missionOrganizationRNAVerified: OrganizationRecord["rna"] | null;
  missionOrganizationVerifiedId: PublisherOrganizationRecord["organizationIdVerified"] | null;
};

export type ModerationFilters = {
  ids?: string[];
  moderatorId?: string;
  publisherIds?: string[];
  missionId?: string;
  status?: string;
  comment?: string;
  domain?: string;
  department?: string;
  organizationNames?: string[];
  organizationClientId?: string;
  cities?: string[];
  activity?: string;
  search?: string;
  limit?: number;
  skip?: number;
  sort?: "asc" | "desc" | null;
};
