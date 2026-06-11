import { describe, expect, it } from "vitest";

import {
  buildMissionPublisherDiffusionRuleConditionFromRule,
  buildMissionPublisherDiffusionRuleSqlFromRules,
  type PublisherDiffusionRuleCondition,
} from "@/utils/publisher-diffusion-rule-query";

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

describe("buildMissionPublisherDiffusionRuleConditionFromRule - array fields (Prisma where)", () => {
  it("filters the org array field directly on the relation (contains -> has)", () => {
    const where = buildMissionPublisherDiffusionRuleConditionFromRule(rule({ operator: "contains", value: "AFEV" }));

    expect(where).toEqual({ publisherOrganization: { parentOrganizations: { has: "AFEV" } } });
  });

  it("wraps negative array operators in NOT (does_not_contain)", () => {
    const where = buildMissionPublisherDiffusionRuleConditionFromRule(rule({ operator: "does_not_contain", value: "Armee de l'air" }));

    expect(where).toEqual({ NOT: { publisherOrganization: { parentOrganizations: { has: "Armee de l'air" } } } });
  });

  it("wraps negative array operators in NOT (is_not)", () => {
    const where = buildMissionPublisherDiffusionRuleConditionFromRule(rule({ operator: "is_not", value: "AFEV" }));

    expect(where).toEqual({ NOT: { publisherOrganization: { parentOrganizations: { has: "AFEV" } } } });
  });

  it("keeps generic handling for exists on an array field", () => {
    const where = buildMissionPublisherDiffusionRuleConditionFromRule(rule({ operator: "exists", value: "" }));

    expect(where).toEqual({ publisherOrganization: { parentOrganizations: { isEmpty: false } } });
  });

  it("handles scalar fields", () => {
    const where = buildMissionPublisherDiffusionRuleConditionFromRule(rule({ field: "publisherOrganization.clientId", fieldType: "string", operator: "is", value: "client-1" }));

    expect(where).toEqual({ publisherOrganization: { clientId: "client-1" } });
  });
});
