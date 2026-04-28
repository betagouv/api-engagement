import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";

import { TYPESENSE_MISSION_COLLECTION } from "@/config";

import { typesenseClient } from "./client";
import { INDEXED_TAXONOMY_KEYS } from "./mission-fields";

export const MISSION_COLLECTION_SCHEMA: CollectionCreateSchema = {
  name: TYPESENSE_MISSION_COLLECTION,
  fields: [
    { name: "id", type: "string" },
    { name: "publisherId", type: "string", facet: true },
    { name: "departmentCodes", type: "string[]", facet: true },
    ...INDEXED_TAXONOMY_KEYS.map((name) => ({ name, type: "string[]" as const, facet: true, optional: true })),
  ],
};

export async function ensureMissionCollection(): Promise<void> {
  try {
    await typesenseClient.collections(TYPESENSE_MISSION_COLLECTION).retrieve();
  } catch (error: unknown) {
    if ((error as { httpStatus?: number }).httpStatus !== 404) {
      throw error;
    }
    await typesenseClient.collections().create(MISSION_COLLECTION_SCHEMA);
  }
}
