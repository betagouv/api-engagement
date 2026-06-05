import { describe, expect, it, vi } from "vitest";

import { applyWidgetRules, type OrganizationArrayIdsResolver } from "@/utils/widget";

type Rule = { field: string; operator: string; value: string; combinator: "and" | "or" };

const rule = (override: Partial<Rule> = {}): Rule => ({
  field: "title",
  operator: "contains",
  value: "mentor",
  combinator: "or",
  ...override,
});

describe("applyWidgetRules", () => {
  it("returns an empty object when there are no rules", async () => {
    const resolve = vi.fn();
    expect(await applyWidgetRules([], resolve)).toEqual({});
    expect(resolve).not.toHaveBeenCalled();
  });

  it("resolves org array fields to a case-insensitive publisherOrganizationId filter", async () => {
    const resolve: OrganizationArrayIdsResolver = vi.fn().mockResolvedValue(["org-1", "org-2"]);

    const where = await applyWidgetRules([rule({ field: "parentOrganization", operator: "contains", value: "AFEV", combinator: "or" })], resolve);

    expect(resolve).toHaveBeenCalledWith("parent_organizations", "AFEV");
    expect(where).toEqual({ OR: [{ publisherOrganizationId: { in: ["org-1", "org-2"] } }] });
  });

  it("maps organizationActions to the actions column", async () => {
    const resolve: OrganizationArrayIdsResolver = vi.fn().mockResolvedValue(["org-3"]);

    const where = await applyWidgetRules([rule({ field: "organizationActions", operator: "contains", value: "Sport", combinator: "or" })], resolve);

    expect(resolve).toHaveBeenCalledWith("actions", "Sport");
    expect(where).toEqual({ OR: [{ publisherOrganizationId: { in: ["org-3"] } }] });
  });

  it("maps legacy reseaux aliases to the parent_organizations column", async () => {
    const resolve: OrganizationArrayIdsResolver = vi.fn().mockResolvedValue(["org-9"]);

    await applyWidgetRules([rule({ field: "associationReseaux", operator: "is", value: "Afev", combinator: "or" })], resolve);

    // l'opérateur legacy "is" est normalisé en "contains" pour les champs array
    expect(resolve).toHaveBeenCalledWith("parent_organizations", "Afev");
  });

  it("wraps does_not_contain on an org array field in NOT", async () => {
    const resolve: OrganizationArrayIdsResolver = vi.fn().mockResolvedValue(["org-1"]);

    const where = await applyWidgetRules([rule({ field: "parentOrganization", operator: "does_not_contain", value: "AFEV", combinator: "or" })], resolve);

    expect(where).toEqual({ OR: [{ NOT: { publisherOrganizationId: { in: ["org-1"] } } }] });
  });

  it("returns an empty in-filter when no organization matches (matches nothing)", async () => {
    const resolve: OrganizationArrayIdsResolver = vi.fn().mockResolvedValue([]);

    const where = await applyWidgetRules([rule({ field: "parentOrganization", operator: "contains", value: "UNKNOWN", combinator: "or" })], resolve);

    expect(where).toEqual({ OR: [{ publisherOrganizationId: { in: [] } }] });
  });

  it("preserves AND/OR combinators across mixed text and org array rules", async () => {
    const resolve: OrganizationArrayIdsResolver = vi.fn().mockResolvedValue(["org-1"]);

    const where = await applyWidgetRules(
      [
        rule({ field: "title", operator: "contains", value: "mentor", combinator: "and" }),
        rule({ field: "parentOrganization", operator: "contains", value: "AFEV", combinator: "and" }),
      ],
      resolve
    );

    expect(where).toEqual({
      AND: [{ title: { contains: "mentor", mode: "insensitive" } }, { publisherOrganizationId: { in: ["org-1"] } }],
    });
  });

  it("keeps Mission-level tags as a case-sensitive has filter (not resolved)", async () => {
    const resolve = vi.fn();

    const where = await applyWidgetRules([rule({ field: "tags", operator: "contains", value: "health", combinator: "or" })], resolve);

    expect(resolve).not.toHaveBeenCalled();
    expect(where).toEqual({ OR: [{ tags: { has: "health" } }] });
  });
});
