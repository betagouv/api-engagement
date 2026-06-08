import { beforeEach, describe, expect, it, vi } from "vitest";

import { captureException } from "@/error";
import { publisherDiffusionRulesToMissionFilter } from "@/services/search/collections/missions/diffusion-rules-filter";
import type { PublisherDiffusionRuleRecord } from "@/types/publisher-diffusion-rule";

vi.mock("@/error", () => ({
  captureException: vi.fn(),
}));

const buildRule = (overrides: Partial<PublisherDiffusionRuleRecord> = {}): PublisherDiffusionRuleRecord => ({
  id: "rule-1",
  publisherId: "diffuseur-1",
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

describe("publisherDiffusionRulesToMissionFilter", () => {
  beforeEach(() => {
    vi.mocked(captureException).mockClear();
  });

  it("ne contraint pas quand aucune règle n'est configurée", () => {
    const result = publisherDiffusionRulesToMissionFilter([]);

    expect(result).toEqual({ kind: "all", missionWhere: null });
  });

  it("traduit les règles racines publisherId is en filtre de recherche", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "rule-1", value: "annonceur-1" }),
      buildRule({ id: "rule-2", value: "annonceur-2", position: 1 }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy: "publisherId:=[`annonceur-1`,`annonceur-2`]",
      missionWhere: { publisherId: { in: ["annonceur-1", "annonceur-2"] } },
    });
  });

  it("compacte les longues listes de publisherId pour éviter les query strings de recherche trop longues", () => {
    const result = publisherDiffusionRulesToMissionFilter(
      Array.from({ length: 120 }, (_, index) => buildRule({ id: `rule-${index}`, value: `annonceur-${index}`, position: index }))
    );

    expect(result.kind).toBe("filter");
    if (result.kind === "filter") {
      expect(result.filterBy).toMatch(/^publisherId:=\[/);
      expect(result.filterBy).not.toContain(" || ");
      expect(result.filterBy.length).toBeLessThan(4000);
    }
  });

  it("traduit les enfants publisherOrganizationId", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is", value: "po-1" }),
      buildRule({ id: "child-2", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is_not", value: "po-2" }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy: "(publisherId:=`annonceur-1` && publisherOrganizationId:=`po-1` && publisherOrganizationId:!=`po-2`)",
      missionWhere: {
        AND: [{ publisherId: "annonceur-1" }, { publisherOrganizationId: "po-1" }, { publisherOrganizationId: { not: "po-2" } }],
      },
    });
  });

  it("traduit les enfants publisherOrganization.parentOrganizations", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganization.parentOrganizations", operator: "is", value: "Réseau 1" }),
      buildRule({ id: "child-2", combinedWithId: "root-1", field: "publisherOrganization.parentOrganizations", operator: "is_not", value: "Réseau 2" }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy:
        "(publisherId:=`annonceur-1` && publisherOrganizationParentOrganizations:=`Réseau 1` && publisherOrganizationParentOrganizations:!=`Réseau 2`)",
      missionWhere: {
        AND: [
          { publisherId: "annonceur-1" },
          { publisherOrganization: { parentOrganizations: { has: "Réseau 1" } } },
          { NOT: { publisherOrganization: { parentOrganizations: { has: "Réseau 2" } } } },
        ],
      },
    });
  });

  it("traduit récursivement les descendants supportés", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is", value: "po-1" }),
      buildRule({
        id: "grandchild-1",
        combinedWithId: "child-1",
        field: "publisherOrganization.parentOrganizations",
        operator: "is",
        value: "Réseau 1",
      }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy: "(publisherId:=`annonceur-1` && (publisherOrganizationId:=`po-1` && publisherOrganizationParentOrganizations:=`Réseau 1`))",
      missionWhere: {
        AND: [{ publisherId: "annonceur-1" }, { AND: [{ publisherOrganizationId: "po-1" }, { publisherOrganization: { parentOrganizations: { has: "Réseau 1" } } }] }],
      },
    });
  });

  it("ignore les groupes qui contiennent un enfant non supporté", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "type", value: "benevolat" }),
      buildRule({ id: "root-2", value: "annonceur-2" }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy: "publisherId:=`annonceur-2`",
      missionWhere: { publisherId: "annonceur-2" },
    });
  });

  it("ignore les groupes qui contiennent un descendant non supporté", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "publisherOrganizationId", operator: "is", value: "po-1" }),
      buildRule({ id: "grandchild-1", combinedWithId: "child-1", field: "type", value: "benevolat" }),
      buildRule({ id: "root-2", value: "annonceur-2" }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy: "publisherId:=`annonceur-2`",
      missionWhere: { publisherId: "annonceur-2" },
    });
  });

  it("retourne none quand aucun groupe n'est supporté", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "type", value: "benevolat" }),
    ]);

    expect(result).toEqual({ kind: "none", missionWhere: null });
  });

  it("lève une alerte Sentry quand une règle n'est pas supportée", () => {
    publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "root-alert", value: "annonceur-alert" }),
      buildRule({ id: "unsupported-alert", combinedWithId: "root-alert", field: "type", value: "benevolat" }),
    ]);

    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: expect.objectContaining({
        reason: "unsupported_child_field",
        ruleId: "unsupported-alert",
        publisherId: "diffuseur-1",
        combinedWithId: "root-alert",
        field: "type",
        operator: "is",
        value: "benevolat",
      }),
    });
  });

  it("déduplique les publisherIds supportés", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "rule-1", value: "annonceur-1" }),
      buildRule({ id: "rule-2", value: "annonceur-1", position: 1 }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy: "publisherId:=`annonceur-1`",
      missionWhere: { publisherId: "annonceur-1" },
    });
  });
});
