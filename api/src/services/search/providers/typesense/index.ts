import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import type { SearchParams } from "typesense/lib/Typesense/Types";

import type { SearchProvider } from "@/services/search/types";

import { typesenseClient } from "./client";
import { ensureCollection } from "./utils";

export class TypesenseSearchProvider implements SearchProvider {
  private ensurePromises = new Map<string, Promise<void>>();

  ensure(schema: CollectionCreateSchema): Promise<void> {
    if (!this.ensurePromises.has(schema.name)) {
      this.ensurePromises.set(
        schema.name,
        ensureCollection(schema).catch((err) => {
          this.ensurePromises.delete(schema.name);
          throw err;
        })
      );
    }
    return this.ensurePromises.get(schema.name)!;
  }

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
