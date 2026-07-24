import { publisherDiffusionTaskService } from "@/services/publisher-diffusion-task";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import type { PublisherDiffusionRuleFindParams, PublisherDiffusionRuleRecord } from "@/types/publisher-diffusion-rule";

type CreateScopedRuleInput = {
  diffuseurPublisherId: string;
  annonceurPublisherId: string;
  field: string;
  fieldType?: string | null;
  operator: string;
  value: string;
};

export const publisherDiffusionRuleMutationService = {
  async createScopedRule(input: CreateScopedRuleInput): Promise<PublisherDiffusionRuleRecord> {
    const { rule, changed } = await publisherDiffusionRuleService.createScopedRuleWithStatus(input);
    if (changed) {
      await publisherDiffusionTaskService.enqueue([input.diffuseurPublisherId]);
    }
    return rule;
  },

  async deleteRule(id: string): Promise<void> {
    const deleted = await publisherDiffusionRuleService.deleteRule(id);
    await publisherDiffusionTaskService.enqueue([deleted.publisherId]);
  },

  async deleteRules(params: PublisherDiffusionRuleFindParams): Promise<number> {
    const { count, publisherIds } = await publisherDiffusionRuleService.deleteRulesWithPublisherIds(params);
    if (count > 0) {
      await publisherDiffusionTaskService.enqueue(publisherIds);
    }
    return count;
  },
};
