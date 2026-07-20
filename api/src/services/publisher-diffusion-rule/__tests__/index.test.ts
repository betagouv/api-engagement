import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import publisherDiffusionRuleService, { DIFFUSION_SCOPE_ROOT_CRITERIA } from "@/services/publisher-diffusion-rule";

const prismaMock = prisma as unknown as {
  publisherDiffusionRule: {
    findMany: ReturnType<typeof vi.fn>;
  };
  publisher: {
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

  it("ajoute le scope implicite du diffuseur à l'annonceur configuré", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "publisher-1" }] });
  });

  it("combine l'annonceur avec ses critères enfants (publisherId AND <critère>)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganization.clientId", operator: "is_not", value: "po-1" }),
      buildRule({ id: "child-2", combinedWithId: "root-1", field: "publisherOrganization.clientId", operator: "is_not", value: "po-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1");

    expect(where).toEqual({
      OR: [
        { AND: [{ publisherId: "annonceur-1" }, { publisherOrganization: { is: { AND: [{ clientId: { not: "po-1" } }, { clientId: { not: "po-2" } }] } } }] },
        { publisherId: "publisher-1" },
      ],
    });
  });

  it("combine plusieurs annonceurs en allowlist (OR)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }, { publisherId: "publisher-1" }] });
  });

  it("restreint les scopes aux annonceurs demandés", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1", ["annonceur-2"]);

    expect(where).toEqual({ publisherId: "annonceur-2" });
  });

  it("renvoie un filtre impossible quand les annonceurs demandés sont hors scope", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1", ["annonceur-2"]);

    expect(where).toEqual({ id: { in: [] } });
  });

  it("autorise le diffuseur à diffuser ses propres missions même hors allowlist", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1", ["publisher-1"]);

    expect(where).toEqual({ publisherId: "publisher-1" });
  });

  it("combine le scope implicite du diffuseur avec les annonceurs demandés de l'allowlist", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1", ["publisher-1", "annonceur-1"]);

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "publisher-1" }] });
  });

  it("exclut les annonceurs hors allowlist même quand le diffuseur est demandé", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1", ["publisher-1", "annonceur-2"]);

    expect(where).toEqual({ publisherId: "publisher-1" });
  });

  it("n'ajoute pas de scope implicite quand le diffuseur a un scope explicite avec critères", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "publisher-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "type", operator: "is", value: "benevolat" }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("publisher-1", ["publisher-1"]);

    expect(where).toEqual({ AND: [{ publisherId: "publisher-1" }, { type: "benevolat" }] });
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

  it("un seul annonceur sans critère → OR avec le scope implicite du diffuseur", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "diffuseur-1" }] });
  });

  it("plusieurs annonceurs → OR des scopes (allowlist)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }, { publisherId: "diffuseur-1" }] });
  });

  it("applique les critères enfants en AND dans le scope", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganization.clientId", operator: "is_not", value: "po-1" }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({
      OR: [{ AND: [{ publisherId: "annonceur-1" }, { publisherOrganization: { clientId: { not: "po-1" } } }] }, { publisherId: "diffuseur-1" }],
    });
  });

  it("descend récursivement quand un critère enfant a lui-même un enfant", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "type", operator: "is", value: "benevolat" }),
      buildRule({ id: "grandchild-1", combinedWithId: "child-1", field: "publisherOrganization.clientId", operator: "is_not", value: "po-1" }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({
      OR: [{ AND: [{ publisherId: "annonceur-1" }, { AND: [{ type: "benevolat" }, { publisherOrganization: { clientId: { not: "po-1" } } }] }] }, { publisherId: "diffuseur-1" }],
    });
  });

  it("ignore les racines top-level qui ne sont pas des scopes annonceur (field ≠ publisherId)", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", field: "type", operator: "is", value: "benevolat", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "diffuseur-1" }] });
  });

  it("ignore les racines publisherId qui ne sont pas des scopes positifs", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", operator: "is_not", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateWhere("diffuseur-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "diffuseur-1" }] });
  });

  it("renvoie la liste des annonceurs configurés avec le where, sans le scope implicite du diffuseur", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "root-2", value: "annonceur-2", position: 1 }),
      buildRule({ id: "root-3", operator: "is_not", value: "annonceur-3", position: 2 }),
    ]);

    const filter = await publisherDiffusionRuleService.buildMissionDiffuseurCandidateFilter("diffuseur-1");

    expect(filter.publisherIds).toEqual(["annonceur-1", "annonceur-2"]);
    expect(filter.scopePublisherIds).toEqual(["annonceur-1", "annonceur-2", "diffuseur-1"]);
    expect(filter.scopes).toEqual([{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }, { publisherId: "diffuseur-1" }]);
    expect(filter.where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }, { publisherId: "diffuseur-1" }] });
  });
});

describe("publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere", () => {
  beforeEach(() => {
    prismaMock.publisherDiffusionRule.findMany.mockReset();
  });

  it("limite le snapshot aux missions propres quand le diffuseur n'a aucune allowlist", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere("diffuseur-1");

    expect(where).toEqual({ publisherId: "diffuseur-1" });
  });

  it("réunit l'allowlist explicite et le scope propre", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([buildRule({ id: "root-1", value: "annonceur-1" })]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere("diffuseur-1");

    expect(where).toEqual({ OR: [{ publisherId: "annonceur-1" }, { publisherId: "diffuseur-1" }] });
  });

  it("respecte les critères d'une root propre explicite", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "root-1", value: "diffuseur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "type", operator: "is", value: "benevolat" }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionDiffuseurSnapshotWhere("diffuseur-1");

    expect(where).toEqual({ AND: [{ publisherId: "diffuseur-1" }, { type: "benevolat" }] });
  });
});

describe("publisherDiffusionRuleService.findDistributionPublisherIdsForSnapshot", () => {
  beforeEach(() => {
    prismaMock.publisher.findMany.mockReset();
  });

  it("sélectionne les publishers actifs avec droits API ou root allowlist", async () => {
    prismaMock.publisher.findMany.mockResolvedValue([{ id: "api-only" }, { id: "rule-only" }, { id: "both" }]);

    const publisherIds = await publisherDiffusionRuleService.findDistributionPublisherIdsForSnapshot();

    expect(prismaMock.publisher.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [{ hasApiRights: true }, { diffusionRules: { some: DIFFUSION_SCOPE_ROOT_CRITERIA } }],
      },
      select: { id: true },
    });
    expect(publisherIds).toEqual(["api-only", "rule-only", "both"]);
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
        AND: [{ id: "mission-1" }, { OR: [{ publisherId: "annonceur-1" }, { publisherId: "publisher-1" }] }],
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
