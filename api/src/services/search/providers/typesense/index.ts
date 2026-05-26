import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import type { SearchParams } from "typesense/lib/Typesense/Types";

import type { SearchProvider } from "@/services/search/types";

import { typesenseClient } from "./client";

export class TypesenseSearchProvider implements SearchProvider {
  async search<TDoc extends object>(collection: string, params: SearchParams<TDoc>): Promise<SearchResponse<TDoc>> {
    return typesenseClient.collections<TDoc>(collection).documents().search(params);
  }

  async upsert<TDoc extends object>(collection: string, document: TDoc): Promise<TDoc> {
    return typesenseClient.collections<TDoc>(collection).documents().upsert(document);
  }

  async delete(collection: string, documentId: string): Promise<{ id: string }> {
    return typesenseClient.collections(collection).documents(documentId).delete() as Promise<{ id: string }>;
  }
}
