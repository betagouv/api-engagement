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

describe("publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere", () => {
  beforeEach(() => {
    prismaMock.publisherDiffusionRule.findMany.mockReset();
  });

  it("charge toutes les rules du publisher triées par position", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1");

    expect(where).toEqual({});
    expect(prismaMock.publisherDiffusionRule.findMany).toHaveBeenCalledWith({
      where: { publisherId: "publisher-1" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
  });

  it("réduit un annonceur sans enfant à son simple publisherId", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1");

    expect(where).toEqual({ publisherId: "annonceur-1" });
  });

  it("combine l'annonceur avec ses critères enfants (publisherId AND <critère>)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
      buildRule({ id: "child-2", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is_not", value: "po-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1");

    expect(where).toEqual({
      AND: [{ publisherId: "annonceur-1" }, { publisherOrganizationId: { not: "po-1" } }, { publisherOrganizationId: { not: "po-2" } }],
    });
  });

  it("combine plusieurs annonceurs en allowlist (OR)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }] });
  });

  it("restreint les scopes aux annonceurs demandés", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1", ["annonceur-2"]);

    expect(where).toEqual({ publisherId: "annonceur-2" });
  });
});

describe("publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere", () => {
  beforeEach(() => {
    prismaMock.publisherDiffusionRule.findMany.mockReset();
  });

  it("renvoie {} quand le diffuseur n'a aucune rule", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({});
  });

  it("un seul annonceur sans critère → filtre positif publisherId", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ publisherId: "annonceur-1" });
  });

  it("plusieurs annonceurs → OR des scopes (allowlist)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }] });
  });

  it("applique les critères enfants en AND dans le scope", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ AND: [{ publisherId: "annonceur-1" }, { publisherOrganizationId: { not: "po-1" } }] });
  });

  it("descend récursivement quand un critère enfant a lui-même un enfant", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "type", operator: "is", value: "benevolat" }),
      buildRule({ id: "grandchild-1", combinedWithId: "child-1", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ AND: [{ publisherId: "annonceur-1" }, { AND: [{ type: "benevolat" }, { publisherOrganizationId: { not: "po-1" } }] }] });
  });

  it("ignore les racines top-level qui ne sont pas des scopes annonceur (field ≠ publisherId)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", field: "type", operator: "is", value: "benevolat", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ publisherId: "annonceur-1" });
  });

  it("ignore les racines publisherId qui ne sont pas des scopes positifs", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", operator: "is_not", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ publisherId: "annonceur-1" });
  });

  it("renvoie la liste des annonceurs configurés avec le where", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
      buildRule({ id: "root-3", operator: "is_not", value: "annonceur-3", position: 2 }),
    ]);

    const filter = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateFilter("diffuseur-1");

    expect(filter.publisherIds).toEqual(["annonceur-1", "annonceur-2"]);
    expect(filter.where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }] });
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

describe("publisherDiffusionRuleService.buildMissionDiffuseurCandidateWheres", () => {
  beforeEach(() => {
    prismaMock.publisherDiffusionRule.findMany.mockReset();
  });

  it("renvoie null quand le diffuseur n'a aucune rule (fallback chemin standard)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([]);

    const branches = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWheres("diffuseur-1");

    expect(branches).toBeNull();
  });

  it("décompose l'allowlist en branches : une par annonceur à critères, les annonceurs nus regroupés", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
      buildRule({ id: "root-3", value: "annonceur-3", position: 2 }),
      buildRule({ id: "child-1", combinedWithId: "root-2", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
      buildRule({ id: "child-2", combinedWithId: "root-2", field: "publisherOrganizationId", operator: "is_not", value: "po-2", position: 1 }),
    ]);

    const branches = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWheres("diffuseur-1");

    expect(branches).toEqual([
      { AND: [{ publisherId: "annonceur-2" }, { publisherOrganizationId: { not: "po-1" } }, { publisherOrganizationId: { not: "po-2" } }] },
      { publisherId: { in: ["annonceur-1", "annonceur-3"] } },
    ]);
  });

  it("restreint les branches aux annonceurs demandés", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
      buildRule({ id: "child-1", combinedWithId: "root-2", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);

    const branches = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWheres("diffuseur-1", ["annonceur-1"]);

    // Une seule branche restante → décomposition inutile, chemin standard.
    expect(branches).toBeNull();
  });

  it("renvoie null quand la décomposition n'apporte rien (moins de 2 branches)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
    ]);

    const branches = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWheres("diffuseur-1");

    // Deux annonceurs nus → fusionnés en un seul `IN` → 1 branche → null.
    expect(branches).toBeNull();
  });

  it("renvoie null quand un annonceur apparaît dans plusieurs scopes (branches non disjointes)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-1", position: 1 }),
      buildRule({ id: "child-1", combinedWithId: "root-2", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);

    const branches = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWheres("diffuseur-1");

    expect(branches).toBeNull();
  });

  it("renvoie null quand un scope n'a pas de restriction publisher exploitable", async () => {
    // `value` vide → condition publisherId ignorée par le builder : la décomposition serait incorrecte.
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
      buildRule({ id: "child-1", combinedWithId: "root-2", field: "publisherOrganizationId", operator: "is_not", value: "po-1" }),
    ]);

    const branches = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWheres("diffuseur-1");

    expect(branches).toBeNull();
  });
});
