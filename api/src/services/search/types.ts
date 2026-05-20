import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import type { SearchParams } from "typesense/lib/Typesense/Types";

export interface SearchProvider {
  search<TDoc extends object>(collection: string, params: SearchParams<TDoc>): Promise<SearchResponse<TDoc>>;
  upsert<TDoc extends object>(collection: string, document: TDoc): Promise<TDoc>;
  delete(collection: string, documentId: string): Promise<{ id: string }>;
}
