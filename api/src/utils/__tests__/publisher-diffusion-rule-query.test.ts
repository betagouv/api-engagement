import { describe, expect, it } from "vitest";

import {
  buildMissionPublisherDiffusionRuleConditionFromRule,
  buildMissionPublisherDiffusionRuleSqlFromRules,
  optimizeMissionDiffusionRuleWhere,
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

describe("optimizeMissionDiffusionRuleWhere", () => {
  it("fusionne les filtres frères d'organisation d'un AND en un seul filtre de relation", () => {
    const where = {
      AND: [
        { publisherId: "annonceur-1" },
        { publisherOrganization: { clientId: { not: "671" } } },
        { publisherOrganization: { clientId: { not: "30575" } } },
        { publisherOrganization: { rna: "W662005098" } },
      ],
    };

    expect(optimizeMissionDiffusionRuleWhere(where)).toEqual({
      AND: [{ publisherId: "annonceur-1" }, { publisherOrganization: { is: { AND: [{ clientId: { not: "671" } }, { clientId: { not: "30575" } }, { rna: "W662005098" }] } } }],
    });
  });

  it("est générique : fusionne n'importe quel champ d'organisation, pas seulement clientId", () => {
    const where = {
      AND: [{ publisherOrganization: { name: { contains: "croix", mode: "insensitive" as const } } }, { publisherOrganization: { rna: "W123" } }],
    };

    expect(optimizeMissionDiffusionRuleWhere(where)).toEqual({
      AND: [{ publisherOrganization: { is: { AND: [{ name: { contains: "croix", mode: "insensitive" } }, { rna: "W123" }] } } }],
    });
  });

  it("ne fusionne pas un filtre d'organisation unique", () => {
    const where = { AND: [{ publisherId: "annonceur-1" }, { publisherOrganization: { clientId: { not: "671" } } }] };

    expect(optimizeMissionDiffusionRuleWhere(where)).toEqual(where);
  });

  it("laisse intactes les conditions négatives (NOT) non fusionnables", () => {
    const where = {
      AND: [
        { publisherOrganization: { clientId: { not: "671" } } },
        { NOT: { publisherOrganization: { parentOrganizations: { has: "AFEV" } } } },
        { publisherOrganization: { clientId: { not: "915" } } },
      ],
    };

    expect(optimizeMissionDiffusionRuleWhere(where)).toEqual({
      AND: [
        { NOT: { publisherOrganization: { parentOrganizations: { has: "AFEV" } } } },
        { publisherOrganization: { is: { AND: [{ clientId: { not: "671" } }, { clientId: { not: "915" } }] } } },
      ],
    });
  });

  it("récurse dans les scopes d'un OR (allowlist multi-annonceurs)", () => {
    const where = {
      OR: [{ AND: [{ publisherId: "a-1" }, { publisherOrganization: { clientId: { not: "1" } } }, { publisherOrganization: { clientId: { not: "2" } } }] }, { publisherId: "a-2" }],
    };

    expect(optimizeMissionDiffusionRuleWhere(where)).toEqual({
      OR: [{ AND: [{ publisherId: "a-1" }, { publisherOrganization: { is: { AND: [{ clientId: { not: "1" } }, { clientId: { not: "2" } }] } } }] }, { publisherId: "a-2" }],
    });
  });

  it("ne touche pas un where sans AND d'organisation", () => {
    const where = { publisherId: "annonceur-1" };

    expect(optimizeMissionDiffusionRuleWhere(where)).toEqual(where);
  });
});
