import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/publisher-diffusion-rule", () => ({
  default: {
    createScopedRuleWithStatus: vi.fn(),
    deleteRule: vi.fn(),
    deleteRulesWithPublisherIds: vi.fn(),
  },
}));

vi.mock("@/services/publisher-diffusion-task", () => ({
  publisherDiffusionTaskService: {
    enqueue: vi.fn(),
  },
}));

import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { publisherDiffusionRuleMutationService } from "@/services/publisher-diffusion-rule/mutations";
import { publisherDiffusionTaskService } from "@/services/publisher-diffusion-task";

const rule = {
  id: "rule-1",
  publisherId: "publisher-1",
  combinedWithId: "root-1",
  field: "publisherOrganization.clientId",
  fieldType: "string",
  operator: "is_not",
  value: "organization-1",
  combinator: "or" as const,
  position: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const ruleServiceMock = publisherDiffusionRuleService as unknown as {
  createScopedRuleWithStatus: ReturnType<typeof vi.fn>;
  deleteRule: ReturnType<typeof vi.fn>;
  deleteRulesWithPublisherIds: ReturnType<typeof vi.fn>;
};
const taskServiceMock = publisherDiffusionTaskService as unknown as {
  enqueue: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  taskServiceMock.enqueue.mockResolvedValue(undefined);
});

describe("publisherDiffusionRuleMutationService", () => {
  it("déclenche le publisher après la création effective d'une règle", async () => {
    ruleServiceMock.createScopedRuleWithStatus.mockResolvedValue({ rule, changed: true });

    await expect(
      publisherDiffusionRuleMutationService.createScopedRule({
        diffuseurPublisherId: "publisher-1",
        annonceurPublisherId: "annonceur-1",
        field: rule.field,
        fieldType: rule.fieldType,
        operator: rule.operator,
        value: rule.value,
      })
    ).resolves.toEqual(rule);

    expect(taskServiceMock.enqueue).toHaveBeenCalledWith(["publisher-1"]);
  });

  it("ne publie rien quand la règle existe déjà à l'identique", async () => {
    ruleServiceMock.createScopedRuleWithStatus.mockResolvedValue({ rule, changed: false });

    await publisherDiffusionRuleMutationService.createScopedRule({
      diffuseurPublisherId: "publisher-1",
      annonceurPublisherId: "annonceur-1",
      field: rule.field,
      fieldType: rule.fieldType,
      operator: rule.operator,
      value: rule.value,
    });

    expect(taskServiceMock.enqueue).not.toHaveBeenCalled();
  });

  it("déclenche le publisher après une suppression", async () => {
    ruleServiceMock.deleteRule.mockResolvedValue(rule);

    await publisherDiffusionRuleMutationService.deleteRule("rule-1");

    expect(taskServiceMock.enqueue).toHaveBeenCalledWith(["publisher-1"]);
  });

  it("déduplique les publishers touchés par une suppression multiple", async () => {
    ruleServiceMock.deleteRulesWithPublisherIds.mockResolvedValue({ count: 3, publisherIds: ["publisher-1", "publisher-2"] });

    await publisherDiffusionRuleMutationService.deleteRules({ field: rule.field, value: rule.value });

    expect(taskServiceMock.enqueue).toHaveBeenCalledWith(["publisher-1", "publisher-2"]);
  });

  it("ne publie rien quand la suppression multiple est un no-op", async () => {
    ruleServiceMock.deleteRulesWithPublisherIds.mockResolvedValue({ count: 0, publisherIds: [] });

    await publisherDiffusionRuleMutationService.deleteRules({ field: rule.field, value: rule.value });

    expect(taskServiceMock.enqueue).not.toHaveBeenCalled();
  });
});
