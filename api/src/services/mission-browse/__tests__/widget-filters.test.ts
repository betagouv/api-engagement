import { beforeEach, describe, expect, it, vi } from "vitest";

const findRulesMock = vi.hoisted(() => vi.fn());
const findIdsMatchingArrayValueMock = vi.hoisted(() => vi.fn());
const findIdsMatchingNameMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/publisher-diffusion-rule", () => ({
  DIFFUSION_SCOPE_ROOT_CRITERIA: { combinedWithId: null, field: "publisherId", operator: "is" },
  default: { findRules: findRulesMock },
}));

vi.mock("@/services/publisher-organization", () => ({
  default: { findIdsMatchingArrayValue: findIdsMatchingArrayValueMock, findIdsMatchingName: findIdsMatchingNameMock },
}));

import { buildWidgetBaseFilter } from "@/services/mission-browse/widget-filters";
import type { WidgetRecord, WidgetRuleRecord } from "@/types/widget";

const buildRule = (overrides: Partial<WidgetRuleRecord> = {}): WidgetRuleRecord => ({
  id: "rule-1",
  field: "domain",
  fieldType: "string",
  operator: "is",
  value: "Environnement",
  combinator: "and",
  position: 0,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...overrides,
});

const buildWidget = (overrides: Partial<WidgetRecord> = {}): WidgetRecord => ({
  id: "widget-1",
  name: "Widget",
  color: "#000091",
  style: "page",
  type: "benevolat",
  location: null,
  distance: "25km",
  rules: [],
  publishers: ["publisher-root", "publisher-widget-only"],
  url: null,
  jvaModeration: false,
  fromPublisherId: "diffuseur-1",
  fromPublisherName: "Diffuseur",
  active: true,
  deletedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...overrides,
});

describe("buildWidgetBaseFilter", () => {
  beforeEach(() => {
    findRulesMock.mockReset();
    findIdsMatchingArrayValueMock.mockReset();
    findRulesMock.mockResolvedValue([{ value: "publisher-root" }]);
    findIdsMatchingArrayValueMock.mockResolvedValue([]);
    findIdsMatchingNameMock.mockResolvedValue([]);
  });

  it("retourne aucune éligibilité pour une sélection de publishers vide", async () => {
    await expect(buildWidgetBaseFilter(buildWidget({ publishers: [] }))).resolves.toBeNull();
    expect(findRulesMock).not.toHaveBeenCalled();
  });

  it("combine le snapshot matérialisé et le fallback widget-only", async () => {
    const filter = await buildWidgetBaseFilter(buildWidget());

    expect(filter).toBe(
      "((publisherId:=[`publisher-root`] && distributionPublisherIds:=`diffuseur-1`) || publisherId:=[`publisher-widget-only`])"
    );
  });

  it("préserve le filtrage direct lorsqu'aucune root ne couvre les publishers", async () => {
    findRulesMock.mockResolvedValue([]);

    await expect(buildWidgetBaseFilter(buildWidget({ publishers: ["publisher-widget-only"] }))).resolves.toBe("publisherId:=[`publisher-widget-only`]");
  });

  it("ajoute les règles du widget sans matérialiser de widgetIds", async () => {
    const filter = await buildWidgetBaseFilter(buildWidget({ publishers: ["publisher-root"], rules: [buildRule()] }));

    expect(filter).toBe("((publisherId:=[`publisher-root`] && distributionPublisherIds:=`diffuseur-1`) && mission_domain:=`Environnement`)");
  });

  it("résout les règles de réseaux vers des ids d'organisation", async () => {
    findIdsMatchingArrayValueMock.mockResolvedValue(["organization-1", "organization-2"]);

    const filter = await buildWidgetBaseFilter(
      buildWidget({
        publishers: ["publisher-root"],
        rules: [buildRule({ field: "parentOrganization", operator: "contains", value: "AFEV" })],
      })
    );

    expect(findIdsMatchingArrayValueMock).toHaveBeenCalledWith("parent_organizations", "AFEV");
    expect(filter).toContain("publisherOrganizationId:=[`organization-1`,`organization-2`]");
  });

  it("résout les règles sur le nom d'organisation en PostgreSQL", async () => {
    findIdsMatchingNameMock.mockResolvedValue(["organization-1"]);

    const filter = await buildWidgetBaseFilter(
      buildWidget({
        publishers: ["publisher-root"],
        rules: [buildRule({ field: "organizationName", operator: "contains", value: "Secours" })],
      })
    );

    expect(findIdsMatchingNameMock).toHaveBeenCalledWith("contains", "Secours");
    expect(filter).toContain("publisherOrganizationId:=[`organization-1`]");
  });

  it("applique la modération JVA sans exclure les missions propres à JVA", async () => {
    const filter = await buildWidgetBaseFilter(buildWidget({ publishers: ["publisher-root"], jvaModeration: true }));

    expect(filter).toContain("publisherId:=`5f5931496c7ea514150a818f`");
    expect(filter).toContain("moderationAcceptedPublisherIds:=`5f5931496c7ea514150a818f`");
  });

  it("échoue de manière fermée pour un opérateur textuel non reproductible", async () => {
    const filter = await buildWidgetBaseFilter(
      buildWidget({
        publishers: ["publisher-root"],
        rules: [buildRule({ field: "title", operator: "does_not_contain", value: "collecte" })],
      })
    );

    expect(filter).toContain("publisherId:=`__never__`");
  });
});
