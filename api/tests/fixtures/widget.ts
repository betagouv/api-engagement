import { randomUUID } from "node:crypto";

import { widgetService } from "../../src/services/widget";
import type { PublisherRecord } from "../../src/types/publisher";
import type { WidgetCreateInput, WidgetRecord, WidgetRuleInput } from "../../src/types/widget";
import { createTestPublisher } from "./publisher";

type WidgetFixtureInput = Omit<Partial<WidgetCreateInput>, "fromPublisherId"> & {
  fromPublisher?: PublisherRecord;
  fromPublisherId?: never; // Prevent passing fromPublisherId directly
};

export const createTestWidget = async (data: WidgetFixtureInput = {}): Promise<WidgetRecord> => {
  const uniqueSuffix = randomUUID();

  // Always create or use a provided publisher object
  const fromPublisher = data.fromPublisher ?? (await createTestPublisher());

  const defaultData: WidgetCreateInput = {
    name: `Test Widget ${uniqueSuffix.slice(0, 8)}`,
    color: "#000091",
    style: "page",
    type: "benevolat",
    location: null,
    distance: "25km",
    rules: [],
    publishers: [],
    url: null,
    jvaModeration: false,
    fromPublisherId: fromPublisher.id,
    active: true,
    deletedAt: null,
  };

  const widgetData: WidgetCreateInput = {
    ...defaultData,
    ...data,
    name: data.name ?? defaultData.name,
    fromPublisherId: fromPublisher.id,
  };

  return widgetService.createWidget(widgetData);
};

export const createTestWidgetRule = (field: string, operator: string, value: string, overrides: Partial<WidgetRuleInput> = {}): WidgetRuleInput => ({
  combinator: "and",
  field,
  fieldType: null,
  operator,
  value,
  ...overrides,
});
