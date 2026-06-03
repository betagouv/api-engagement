import type { PublisherDiffusionRuleRecord } from "@/types/publisher-diffusion-rule";

type MissionDiffusionRulesFilter =
  | {
      kind: "all";
      publisherIds: null;
    }
  | {
      kind: "filter";
      filterBy: string;
      publisherIds: string[];
    }
  | {
      kind: "none";
      publisherIds: [];
    };

const escapeTypesenseFilterValue = (value: string): string => {
  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
};

const isSupportedPublisherWhitelistRule = (rule: PublisherDiffusionRuleRecord): boolean =>
  rule.combinedWithId === null && rule.field === "publisherId" && rule.operator === "is" && rule.value.trim() !== "";

export const publisherDiffusionRulesToMissionFilter = (rules: PublisherDiffusionRuleRecord[]): MissionDiffusionRulesFilter => {
  if (!rules.length) {
    return { kind: "all", publisherIds: null };
  }

  const publisherIds = Array.from(new Set(rules.filter(isSupportedPublisherWhitelistRule).map((rule) => rule.value.trim())));

  if (!publisherIds.length) {
    return { kind: "none", publisherIds: [] };
  }

  return {
    kind: "filter",
    filterBy: `publisherId:=[${publisherIds.map(escapeTypesenseFilterValue).join(",")}]`,
    publisherIds,
  };
};
