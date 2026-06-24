import type { MultiSearchRequestSchema } from "typesense/lib/Typesense/Types";

import type { SearchProvider, SearchQueryParams, SearchQueryResponse } from "@/services/search/types";

import { typesenseClient } from "./client";

export class TypesenseSearchProvider implements SearchProvider {
  async search<TDoc extends object>(collection: string, params: SearchQueryParams<TDoc>): Promise<SearchQueryResponse<TDoc>> {
    // `multi_search` (POST) transporte les paramètres dans le corps JSON, là où `documents().search()`
    // (GET) les met dans la query string de l'URL, plafonnée à 4000 caractères par Typesense — limite
    // dépassée par le `filter_by` de l'allowlist de diffusion de certains diffuseurs.
    const { results } = await typesenseClient.multiSearch.perform<[TDoc]>({
      searches: [{ collection, ...params } as MultiSearchRequestSchema<TDoc, string>],
    });

    const result = results[0];
    if (result.error) {
      throw new Error(`[search:typesense] multi_search a échoué (code ${result.code}) : ${result.error}`);
    }

    return result as unknown as SearchQueryResponse<TDoc>;
  }

  async upsert<TDoc extends object>(collection: string, document: TDoc): Promise<TDoc> {
    return typesenseClient.collections<TDoc>(collection).documents().upsert(document);
  }

  async delete(collection: string, documentId: string): Promise<{ id: string }> {
    return typesenseClient.collections(collection).documents(documentId).delete() as Promise<{ id: string }>;
  }
}
