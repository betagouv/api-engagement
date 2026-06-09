import type { SearchParams } from "typesense/lib/Typesense/Types";

import type { SearchProvider, SearchQueryParams, SearchQueryResponse } from "@/services/search/types";

import { typesenseClient } from "./client";

export class TypesenseSearchProvider implements SearchProvider {
  async search<TDoc extends object>(collection: string, params: SearchQueryParams<TDoc>): Promise<SearchQueryResponse<TDoc>> {
    return typesenseClient.collections<TDoc>(collection).documents().search(params as SearchParams<TDoc>) as unknown as Promise<SearchQueryResponse<TDoc>>;
  }

  async upsert<TDoc extends object>(collection: string, document: TDoc): Promise<TDoc> {
    return typesenseClient.collections<TDoc>(collection).documents().upsert(document);
  }

  async delete(collection: string, documentId: string): Promise<{ id: string }> {
    return typesenseClient.collections(collection).documents(documentId).delete() as Promise<{ id: string }>;
  }
}
