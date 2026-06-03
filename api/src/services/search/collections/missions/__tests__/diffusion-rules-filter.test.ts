import { describe, expect, it } from "vitest";

import { publisherDiffusionRulesToMissionFilter } from "@/services/search/collections/missions/diffusion-rules-filter";
import type { PublisherDiffusionRuleRecord } from "@/types/publisher-diffusion-rule";

const buildRule = (overrides: Partial<PublisherDiffusionRuleRecord> = {}): PublisherDiffusionRuleRecord => ({
  id: "rule-1",
  publisherId: "diffuseur-1",
  combinedWithId: null,
  field: "publisherId",
  fieldType: "string",
  operator: "is",
  value: "annonceur-1",
  combinator: "or",
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("publisherDiffusionRulesToMissionFilter", () => {
  it("traduit les règles racines publisherId is en filtre Typesense", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "rule-1", value: "annonceur-1" }),
      buildRule({ id: "rule-2", value: "annonceur-2", position: 1 }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy: "publisherId:=[`annonceur-1`,`annonceur-2`]",
      publisherIds: ["annonceur-1", "annonceur-2"],
    });
  });

  it("ignore les règles non supportées pour le moment", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "child-1", combinedWithId: "rule-1", value: "annonceur-1" }),
      buildRule({ id: "rule-2", field: "publisherOrganizationId", value: "po-1" }),
      buildRule({ id: "rule-3", operator: "is_not", value: "annonceur-2" }),
      buildRule({ id: "rule-4", value: "" }),
    ]);

    expect(result).toEqual({ kind: "none", publisherIds: [] });
  });

  it("déduplique les publisherIds supportés", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "rule-1", value: "annonceur-1" }),
      buildRule({ id: "rule-2", value: "annonceur-1", position: 1 }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy: "publisherId:=[`annonceur-1`]",
      publisherIds: ["annonceur-1"],
    });
  });
});
