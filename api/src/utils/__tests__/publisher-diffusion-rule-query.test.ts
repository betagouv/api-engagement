import { describe, expect, it } from "vitest";

import { buildMissionPublisherDiffusionRuleSqlFromRules, type PublisherDiffusionRuleCondition } from "@/utils/publisher-diffusion-rule-query";

const rule = (override: Partial<PublisherDiffusionRuleCondition> = {}): PublisherDiffusionRuleCondition => ({
  field: "publisherOrganization.parentOrganizations",
  fieldType: "array",
  operator: "contains",
  value: "AFEV",
  combinator: "or",
  ...override,
});

describe("buildMissionPublisherDiffusionRuleSqlFromRules - array fields", () => {
  it("matches array elements case-insensitively via unnest + lower", () => {
    const sql = buildMissionPublisherDiffusionRuleSqlFromRules([rule({ operator: "contains" })]);

    expect(sql.sql).toContain("unnest");
    expect(sql.sql).toContain("lower(elem) = lower(");
    expect(sql.sql).not.toContain("= ANY(");
    expect(sql.values).toContain("AFEV");
  });

  it("negates the case-insensitive match for does_not_contain", () => {
    const sql = buildMissionPublisherDiffusionRuleSqlFromRules([rule({ operator: "does_not_contain" })]);

    expect(sql.sql).toContain("NOT");
    expect(sql.sql).toContain("lower(elem) = lower(");
  });
});
