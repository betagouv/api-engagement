import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

const prismaMock = prisma as unknown as {
  publisherDiffusionRule: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const getSqlText = (query: unknown): string => {
  if (typeof query === "object" && query !== null && "sql" in query && typeof query.sql === "string") {
    return query.sql;
  }

  if (typeof query === "object" && query !== null && "text" in query && typeof query.text === "string") {
    return query.text;
  }

  if (typeof query === "object" && query !== null && "strings" in query && Array.isArray(query.strings)) {
    return query.strings.join("");
  }

  return String(query);
};

const buildRule = (overrides: Record<string, unknown> = {}) => ({
  id: "rule-1",
  publisherId: "publisher-1",
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

describe("publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere", () => {
  beforeEach(() => {
    prismaMock.publisherDiffusionRule.findMany.mockReset();
  });

  it("loads the publisher's rules sorted by position", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({});
    expect(prismaMock.publisherDiffusionRule.findMany).toHaveBeenCalledWith({
      where: { publisherId: "publisher-1" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
  });

  it("creates an OR condition for rules migrated from publisher_diffusion", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "rule-1", value: "annonceur-1", position: 0 }),
      buildRule({ id: "rule-2", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }],
    });
  });

  it("constructs a nested WHERE clause for a relational Prisma field", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({
        field: "publisherOrganization.parentOrganizations",
        value: "Croix-Rouge",
      }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      OR: [
        {
          publisherOrganization: {
            parentOrganizations: {
              has: "Croix-Rouge",
            },
          },
        },
      ],
    });
  });

  it("uses a case-insensitive contains operator for text fields", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({
        field: "title",
        operator: "contains",
        value: "secourisme",
      }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      OR: [
        {
          title: {
            contains: "secourisme",
            mode: "insensitive",
          },
        },
      ],
    });
  });

  it("combines the rules using AND when the combinator is and", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ field: "publisherId", value: "annonceur-1", combinator: "or", position: 0 }),
      buildRule({ field: "type", value: "volontariat_sapeurs_pompiers", combinator: "and", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      AND: [{ publisherId: "annonceur-1" }, { type: "volontariat_sapeurs_pompiers" }],
    });
  });

  it("constructs an SQL query on the mission columns", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "rule-1", value: "annonceur-1", position: 0 }),
      buildRule({ id: "rule-2", field: "type", value: "volontariat_sapeurs_pompiers", position: 1 }),
    ]);

    const sql = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleSql("publisher-1", { missionAlias: "m" });
    const sqlText = getSqlText(sql);

    expect(sqlText).toContain('AND ((m."publisher_id" =');
    expect(sqlText).toContain('OR m."type"::text =');
  });

  it("constructs an SQL fragment using EXISTS for publisherOrganization.parentOrganizations", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({
        field: "publisherOrganization.parentOrganizations",
        value: "Croix-Rouge",
      }),
    ]);

    const sql = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleSql("publisher-1", { missionAlias: "m" });
    const sqlText = getSqlText(sql);

    expect(sqlText).toContain("AND ((EXISTS");
    expect(sqlText).toContain('FROM "publisher_organization" po');
    expect(sqlText).toContain('po."id" = m."publisher_organization_id"');
    expect(sqlText).toContain('= ANY(po."parent_organizations")');
  });

  it("constructs an SQL fragment using EXISTS for publisherOrganization.clientId", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({
        field: "publisherOrganization.clientId",
        value: "organization-client-1",
      }),
    ]);

    const sql = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleSql("publisher-1", { missionAlias: "m" });
    const sqlText = getSqlText(sql);

    expect(sqlText).toContain("AND ((EXISTS");
    expect(sqlText).toContain('FROM "publisher_organization" po');
    expect(sqlText).toContain('po."id" = m."publisher_organization_id"');
    expect(sqlText).toContain('po."client_id" =');
  });

  it("does not filter when the publisher has no rules", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([]);

    const sql = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleSql("publisher-1", { missionAlias: "m" });

    expect(getSqlText(sql)).toBe("");
  });

  it("returns a blocking SQL filter when rules exist but none of them can be applied", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ field: "unknownField" })]);

    const sql = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleSql("publisher-1", { missionAlias: "m" });

    expect(getSqlText(sql)).toBe("AND FALSE");
  });
});
