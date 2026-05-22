import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";

const prismaMock = prisma as unknown as {
  publisherDiffusionRule: {
    findMany: ReturnType<typeof vi.fn>;
  };
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

  it("charge les règles du publisher triées par position", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({});
    expect(prismaMock.publisherDiffusionRule.findMany).toHaveBeenCalledWith({
      where: { publisherId: "publisher-1" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
  });

  it("construit une condition OR pour les règles migrées depuis publisher_diffusion", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ id: "rule-1", value: "annonceur-1", position: 0 }),
      buildRule({ id: "rule-2", value: "annonceur-2", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }],
    });
  });

  it("construit un where imbriqué pour un champ Prisma relationnel", async () => {
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

  it("utilise un contains insensible à la casse pour les champs texte", async () => {
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

  it("combine les règles en AND quand le combinator est and", async () => {
    prismaMock.publisherDiffusionRule.findMany.mockResolvedValue([
      buildRule({ field: "publisherId", value: "annonceur-1", combinator: "or", position: 0 }),
      buildRule({ field: "type", value: "volontariat_sapeurs_pompiers", combinator: "and", position: 1 }),
    ]);

    const where = await publisherDiffusionRuleService.buildMissionPublisherDiffusionRuleWhere("publisher-1");

    expect(where).toEqual({
      AND: [{ publisherId: "annonceur-1" }, { type: "volontariat_sapeurs_pompiers" }],
    });
  });
});
