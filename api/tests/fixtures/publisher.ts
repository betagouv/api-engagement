import { randomUUID } from "node:crypto";

import { publisherService } from "@/services/publisher";
import type { PublisherCreateInput, PublisherRecord } from "@/types/publisher";
import { PublisherMissionType } from "@/types/publisher";

export const createTestPublisher = async (data: Partial<PublisherCreateInput> = {}): Promise<PublisherRecord> => {
  const uniqueSuffix = randomUUID();

  const defaultData = {
    name: `Test Publisher ${uniqueSuffix.slice(0, 8)}`,
    email: `test-${uniqueSuffix}@example.com`,
    apikey: `test-api-key-${uniqueSuffix}`,
    missionType: PublisherMissionType.BENEVOLAT,
    url: "https://example.com",
    logo: "https://example.com/logo.png",
    description: "Test Publisher Description",
    hasWidgetRights: true,
    hasCampaignRights: true,
    hasApiRights: true,
    publishers: [],
    sendReport: false,
    sendReportTo: [],
  };

  const publisherData = {
    ...defaultData,
    ...data,
    apikey: data.apikey ?? defaultData.apikey,
    email: data.email ?? defaultData.email,
    name: data.name ?? defaultData.name,
    publishers: data.publishers ?? defaultData.publishers,
  };

  return publisherService.createPublisher(publisherData);
};
