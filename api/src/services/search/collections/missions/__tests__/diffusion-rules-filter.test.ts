import { describe, expect, it } from "vitest";

import { publisherDiffusionRulesToMissionFilter } from "@/services/search/collections/missions/diffusion-rules-filter";
import type { PublisherDiffusionRuleRecord } from "@/types/publisher-diffusion-rule";

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
  it("ne contraint pas quand aucune règle n'est configurée", () => {
    const result = publisherDiffusionRulesToMissionFilter([]);

    expect(result).toEqual({ kind: "all", missionWhere: null });
  });

  it("traduit les règles racines publisherId is en filtre Typesense", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "rule-1", value: "annonceur-1" }),
      buildRule({ id: "rule-2", value: "annonceur-2", position: 1 }),
    ]);

    expect(result).toEqual({
      kind: "filter",
      filterBy: "(publisherId:=`annonceur-1` || publisherId:=`annonceur-2`)",
      missionWhere: { OR: [{ publisherId: "annonceur-1" }, { publisherId: "annonceur-2" }] },
    });
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

  it("retourne none quand aucun groupe n'est supporté", () => {
    const result = publisherDiffusionRulesToMissionFilter([
      buildRule({ id: "root-1", value: "annonceur-1" }),
      buildRule({ id: "child-1", combinedWithId: "root-1", field: "type", value: "benevolat" }),
    ]);

    expect(result).toEqual({ kind: "none", missionWhere: null });
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
