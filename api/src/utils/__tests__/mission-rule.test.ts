import { describe, expect, it } from "vitest";

import { applyMissionRules, buildNestedMissionWhere, collectMissionRuleConditions, type MissionRule } from "@/utils/mission-rule";

describe("mission-rule utils", () => {
  describe("buildNestedMissionWhere", () => {
    it("builds nested Prisma where input from a dotted field path", () => {
      expect(buildNestedMissionWhere("publisherOrganization.parentOrganizations", { has: "AFEV" })).toEqual({
        publisherOrganization: {
          parentOrganizations: {
            has: "AFEV",
          },
        },
      });
    });
  });

  describe("collectMissionRuleConditions", () => {
    it("uses the second rule combinator for the first condition", () => {
      const rules = [rule({ field: "publisherId", value: "publisher-1", combinator: "or" }), rule({ field: "type", value: "volontariat", combinator: "and" })];

      expect(collectMissionRuleConditions(rules, (currentRule) => currentRule.field)).toEqual({
        andConditions: ["publisherId", "type"],
        orConditions: [],
      });
    });

    it("ignores null conditions", () => {
      const rules = [rule({ field: "publisherId", value: "publisher-1", combinator: "or" }), rule({ field: "type", value: "volontariat", combinator: "or" })];

      expect(collectMissionRuleConditions(rules, (currentRule) => (currentRule.field === "type" ? null : currentRule.field))).toEqual({
        andConditions: [],
        orConditions: ["publisherId"],
      });
    });
  });

  describe("applyMissionRules", () => {
    it("builds basic scalar operators", () => {
      expect(
        applyMissionRules([
          rule({ field: "publisherId", operator: "is", value: "publisher-1", combinator: "or" }),
          rule({ field: "type", operator: "is_not", value: "benevolat", combinator: "and" }),
        ])
      ).toEqual({
        AND: [{ publisherId: "publisher-1" }, { type: { not: "benevolat" } }],
      });
    });

    it("builds array operators and wraps negative array checks in NOT", () => {
      expect(
        applyMissionRules(
          [rule({ field: "tags", operator: "contains", value: "health", combinator: "or" }), rule({ field: "tags", operator: "is_not", value: "private", combinator: "and" })],
          { arrayFields: new Set(["tags"]) }
        )
      ).toEqual({
        AND: [{ tags: { has: "health" } }, { NOT: { tags: { has: "private" } } }],
      });
    });

    it("builds contains and existence operators", () => {
      expect(
        applyMissionRules([
          rule({ field: "title", operator: "contains", value: "mentor", combinator: "or" }),
          rule({ field: "description", operator: "exists", value: null, combinator: "and" }),
        ])
      ).toEqual({
        AND: [{ title: { contains: "mentor", mode: "insensitive" } }, { description: { not: null } }],
      });
    });

    it("supports custom nested field builders", () => {
      expect(
        applyMissionRules([rule({ field: "publisherOrganization.parentOrganizations", operator: "is", value: "AFEV", combinator: "or" })], {
          arrayFields: new Set(["publisherOrganization.parentOrganizations"]),
          buildFieldWhere: buildNestedMissionWhere,
        })
      ).toEqual({
        OR: [
          {
            publisherOrganization: {
              parentOrganizations: {
                has: "AFEV",
              },
            },
          },
        ],
      });
    });

    it("ignores unsupported operators and empty values", () => {
      expect(
        applyMissionRules([
          rule({ field: "publisherId", operator: "is", value: "", combinator: "or" }),
          rule({ field: "type", operator: "unsupported", value: "benevolat", combinator: "or" }),
        ])
      ).toEqual({});
    });
  });
});

const rule = (override: Partial<MissionRule> = {}): MissionRule => ({
  field: "publisherId",
  fieldType: "string",
  operator: "is",
  value: "publisher-1",
  combinator: "or",
  ...override,
});
