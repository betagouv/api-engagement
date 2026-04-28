import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";

import { TYPESENSE_MISSION_COLLECTION } from "@/config";

import { typesenseClient } from "./client";

export const MISSION_COLLECTION_SCHEMA: CollectionCreateSchema = {
  name: TYPESENSE_MISSION_COLLECTION,
  fields: [
    { name: "id", type: "string" },
    { name: "publisherId", type: "string", facet: true },
    { name: "departmentCodes", type: "string[]", facet: true },
    { name: "domaine", type: "string[]", facet: true, optional: true },
    { name: "engagement_intent", type: "string[]", facet: true, optional: true },
    { name: "type_mission", type: "string[]", facet: true, optional: true },
    { name: "tranche_age", type: "string[]", facet: true, optional: true },
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
