import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

const prismaMock = prisma as unknown as {
  publisherDiffusionRule: {
    findMany: ReturnType<typeof vi.fn>;
  };
  mission: {
    count: ReturnType<typeof vi.fn>;
  };
};

const buildRule = (overrides: Record<string, unknown> = {}) => ({
  id: "rule-1",
  publisherId: "publisher-1",
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

describe("publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere", () => {
  beforeEach(() => {
    prismaMock.publisherDiffusionRule.findMany.mockReset();
    prismaMock.mission.count.mockReset();
  });

  it("charge toutes les rules du publisher triées par position", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({});
    expect(prismaMock.publisherDiffusionRule.findMany).toHaveBeenCalledWith({
      where: { publisherId: "publisher-1" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
  });

  it("encode l'implication scope → enfant (NOT scope OR enfant)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      OR: [{ NOT: { publisherId: "annonceur-1" } }, { publisherOrganizationId: { not: "po-1" } }],
    });
  });

  it("AND les enfants entre eux quand il y en a plusieurs sous le même scope", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
      buildRule({ id: "child-2", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is_not", value: "po-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      OR: [{ NOT: { publisherId: "annonceur-1" } }, { AND: [{ publisherOrganizationId: { not: "po-1" } }, { publisherOrganizationId: { not: "po-2" } }] }],
    });
  });

  it("descend récursivement quand un enfant a lui-même des enfants", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "type", operator: "is", value: "benevolat" }),
      buildRule({ id: "grandchild-1", combinedWithId: "child-1", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      OR: [{ NOT: { publisherId: "annonceur-1" } }, { OR: [{ NOT: { type: "benevolat" } }, { publisherOrganizationId: { not: "po-1" } }] }],
    });
  });

  it("AND plusieurs racines indépendantes au top-level", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
      buildRule({ id: "child-2", combinedWithId: "root-2", field: "publisherOrganizationId", operator: "is_not", value: "po-2" }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      AND: [
        { OR: [{ NOT: { publisherId: "annonceur-1" } }, { publisherOrganizationId: { not: "po-1" } }] },
        { OR: [{ NOT: { publisherId: "annonceur-2" } }, { publisherOrganizationId: { not: "po-2" } }] },
      ],
    });
  });
});

describe("publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere", () => {
  beforeEach(() => {
    prismaMock.publisherDiffusionRule.findMany.mockReset();
  });

  it("combine plusieurs annonceurs en allowlist", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }] });
  });
});

describe("publisherDiffusionRuleService.canPublisherAccessMission", () => {
  beforeEach(() => {
    prismaMock.publisherDiffusionRule.findMany.mockReset();
    prismaMock.mission.count.mockReset();
  });

  it("allows access when the publisher has no diffusion rules", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([]);

    const canAccess = await publisherDiffusionRuleService.canPublisherAccessMission({ publisherId: "publisher-1", missionId: "mission-1" });

    expect(canAccess).toBe(true);
    expect(prismaMock.mission.count).not.toHaveBeenCalled();
  });

  it("checks the mission against applicable diffusion rules", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ value: "annonceur-1" })]);
    prismaMock.mission.count.mockResolvedValue(1);

    const canAccess = await publisherDiffusionRuleService.canPublisherAccessMission({ publisherId: "publisher-1", missionId: "mission-1" });

    expect(canAccess).toBe(true);
    expect(prismaMock.mission.count).toHaveBeenCalledWith({
      where: {
        AND: [{ id: "mission-1" }, { publisherId: "annonceur-1" }],
      },
    });
  });

  it("rejects access when the mission does not match applicable diffusion rules", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ value: "annonceur-1" })]);
    prismaMock.mission.count.mockResolvedValue(0);

    const canAccess = await publisherDiffusionRuleService.canPublisherAccessMission({ publisherId: "publisher-1", missionId: "mission-1" });

    expect(canAccess).toBe(false);
  });
});
