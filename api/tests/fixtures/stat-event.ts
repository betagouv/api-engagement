import { statEventService } from "../../src/services/stat-event";
import { StatEventRecord } from "../../src/types";

export async function createClickStat(id: string, overrides: Partial<StatEventRecord> = {}) {
  const record: StatEventRecord = {
    _id: id,
    type: "click",
    createdAt: overrides.createdAt ?? new Date(),
    origin: overrides.origin ?? "https://origin.example.com",
    referer: overrides.referer ?? "https://referrer.example.com",
    userAgent: overrides.userAgent ?? "Mozilla/5.0",
    host: overrides.host ?? "redirect.test",
    user: overrides.user ?? "click-user",
    isBot: overrides.isBot ?? false,
    isHuman: overrides.isHuman ?? false,
    source: overrides.source ?? "publisher",
    sourceId: overrides.sourceId ?? "source-id",
    sourceName: overrides.sourceName ?? "Source Name",
    customAttributes: overrides.customAttributes,
    status: overrides.status ?? "PENDING",
    fromPublisherId: overrides.fromPublisherId ?? "source-publisher-id",
    fromPublisherName: overrides.fromPublisherName ?? "Source Publisher",
    toPublisherId: overrides.toPublisherId ?? "destination-publisher-id",
    toPublisherName: overrides.toPublisherName ?? "Destination Publisher",
    missionId: overrides.missionId ?? "mission-id",
    missionClientId: overrides.missionClientId ?? "mission-client-id",
    missionDomain: overrides.missionDomain ?? "mission-domain",
    missionTitle: overrides.missionTitle ?? "Mission Title",
    missionPostalCode: overrides.missionPostalCode ?? "75000",
    missionDepartmentName: overrides.missionDepartmentName ?? "Paris",
    missionOrganizationId: overrides.missionOrganizationId ?? "mission-org-id",
    missionOrganizationName: overrides.missionOrganizationName ?? "Mission Org",
    missionOrganizationClientId: overrides.missionOrganizationClientId ?? "mission-org-client-id",
    tag: overrides.tag,
    tags: overrides.tags ?? [],
    exportToAnalytics: overrides.exportToAnalytics,
    clickId: overrides.clickId,
    clickUser: overrides.clickUser,
    requestId: overrides.requestId,
  };

  await statEventService.createStatEvent(record);
  return record;
}
