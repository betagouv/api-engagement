import { describe, expect, it, vi } from "vitest";

import type { OrganizationArrayIdsResolver } from "@/types/publisher-organization";
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
  it("resolves the org array field to a case-insensitive publisherOrganizationId filter", async () => {
    const resolve: OrganizationArrayIdsResolver = vi.fn().mockResolvedValue(["org-1", "org-2"]);

    const where = await buildMissionPublisherDiffusionRuleConditionFromRule(rule({ operator: "contains", value: "AFEV" }), resolve);

    expect(resolve).toHaveBeenCalledWith("parent_organizations", "AFEV");
    expect(where).toEqual({ publisherOrganizationId: { in: ["org-1", "org-2"] } });
  });

  it("wraps negative array operators in NOT", async () => {
    const resolve: OrganizationArrayIdsResolver = vi.fn().mockResolvedValue(["org-1"]);

    const where = await buildMissionPublisherDiffusionRuleConditionFromRule(rule({ operator: "is_not", value: "AFEV" }), resolve);

    expect(where).toEqual({ NOT: { publisherOrganizationId: { in: ["org-1"] } } });
  });

  it("does not resolve and keeps generic handling for exists on an array field", async () => {
    const resolve = vi.fn();

    const where = await buildMissionPublisherDiffusionRuleConditionFromRule(rule({ operator: "exists", value: "" }), resolve);

    expect(resolve).not.toHaveBeenCalled();
    expect(where).toEqual({ publisherOrganization: { parentOrganizations: { isEmpty: false } } });
  });

  it("does not resolve scalar fields", async () => {
    const resolve = vi.fn();

    const where = await buildMissionPublisherDiffusionRuleConditionFromRule(
      rule({ field: "publisherOrganization.clientId", fieldType: "string", operator: "is", value: "client-1" }),
      resolve
    );

    expect(resolve).not.toHaveBeenCalled();
    expect(where).toEqual({ publisherOrganization: { clientId: "client-1" } });
  });
});
