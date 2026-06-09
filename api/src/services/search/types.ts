export type SearchCollectionField = {
  name: string;
  type: string;
  facet?: boolean;
  optional?: boolean;
};

export type SearchCollectionSchema = {
  name: string;
  fields?: SearchCollectionField[];
};

export type SearchQueryParams<TDoc extends object> = Record<string, unknown> & {
  q?: string;
  query_by?: keyof TDoc | string;
  filter_by?: string;
  facet_by?: string;
  per_page?: number;
  page?: number;
};

export type SearchQueryResponse<TDoc extends object> = {
  hits?: Array<{ document: TDoc }>;
  found?: number;
  facet_counts?: Array<{
    field_name: string;
    counts: Array<{ value: string; count: number }>;
  }>;
};

export interface SearchProvider {
  search<TDoc extends object>(collection: string, params: SearchQueryParams<TDoc>): Promise<SearchQueryResponse<TDoc>>;
  upsert<TDoc extends object>(collection: string, document: TDoc): Promise<TDoc>;
  delete(collection: string, documentId: string): Promise<{ id: string }>;
}
