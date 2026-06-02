export type PublisherDiffusionRuleCombinator = "and" | "or";

export interface PublisherDiffusionRuleRecord {
  id: string;
  publisherId: string;
  combinedWithId: string | null;
  field: string;
  fieldType: string | null;
  operator: string;
  value: string;
  combinator: PublisherDiffusionRuleCombinator;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  combinedRules?: PublisherDiffusionRuleRecord[];
}

export interface PublisherDiffusionRuleFindParams {
  publisherId?: string;
  publisherIds?: string[];
  combinedWithId?: string | null;
  field?: string;
  value?: string;
  includeCombinedRules?: boolean;
}

export interface PublisherDiffusionRuleCreateInput {
  publisherId: string;
  combinedWithId?: string | null;
  field: string;
  fieldType?: string | null;
  operator: string;
  value: string;
  combinator: PublisherDiffusionRuleCombinator;
  position?: number;
}
