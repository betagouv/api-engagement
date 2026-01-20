import { ModerationEventStatus } from "../db/core";
import { MissionRecord } from "./mission";
import { PublisherRecord } from "./publisher";

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

  missionOrganizationName: MissionRecord["organizationName"];
  missionOrganizationClientId: MissionRecord["organizationClientId"];
  missionOrganizationSiren: MissionRecord["organizationSiren"];
  missionOrganizationRNA: MissionRecord["organizationRNA"];
  missionOrganizationSirenVerified: MissionRecord["organizationSirenVerified"];
  missionOrganizationRNAVerified: MissionRecord["organizationRNAVerified"];
};

export type ModerationFilters = {
  moderatorId?: string;
  publisherId?: string;
  missionId?: string;
  status?: string;
  comment?: string;
  domain?: string;
  department?: string;
  organizationName?: string;
  city?: string;
  activity?: string;
  search?: string;
};
