import type { CollectionFieldSchema, CollectionSchema } from "typesense/lib/Typesense/Collection";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";

import { TYPESENSE_MISSION_COLLECTION } from "@/config";

import { typesenseClient } from "./client";
import { INDEXED_TAXONOMY_KEYS } from "./mission-fields";

export const MISSION_COLLECTION_SCHEMA: CollectionCreateSchema = {
  name: TYPESENSE_MISSION_COLLECTION,
  fields: [
    { name: "publisherId", type: "string", facet: true },
    { name: "departmentCodes", type: "string[]", facet: true },
    ...INDEXED_TAXONOMY_KEYS.map((name) => ({ name, type: "string[]" as const, facet: true, optional: true })),
  ],
};

let ensureMissionCollectionPromise: Promise<void> | null = null;

const getHttpStatus = (error: unknown): number | undefined => (error as { httpStatus?: number }).httpStatus;

const collection = () => typesenseClient.collections(TYPESENSE_MISSION_COLLECTION);

const assertCompatibleField = (expected: CollectionFieldSchema, actual: CollectionFieldSchema): void => {
  const expectedFacet = expected.facet ?? false;
  const actualFacet = actual.facet ?? false;
  const expectedOptional = expected.optional ?? false;
  const actualOptional = actual.optional ?? false;

  if (actual.type !== expected.type || actualFacet !== expectedFacet || actualOptional !== expectedOptional) {
    throw new Error(
      `[typesense] Incompatible field '${expected.name}' in collection '${TYPESENSE_MISSION_COLLECTION}' ` +
        `(expected type=${expected.type}, facet=${expectedFacet}, optional=${expectedOptional}; ` +
        `actual type=${actual.type}, facet=${actualFacet}, optional=${actualOptional})`
    );
  }
};

const syncMissingFields = async (schema: CollectionSchema): Promise<void> => {
  const existingFields = new Map(schema.fields.map((field) => [field.name, field]));
  const missingFields: CollectionFieldSchema[] = [];

  for (const expectedField of MISSION_COLLECTION_SCHEMA.fields) {
    const existingField = existingFields.get(expectedField.name);
    if (!existingField) {
      missingFields.push(expectedField);
      continue;
    }
    assertCompatibleField(expectedField, existingField);
  }

  if (missingFields.length > 0) {
    await collection().update({ fields: missingFields });
  }
};

const ensureMissionCollectionOnce = async (): Promise<void> => {
  try {
    const schema = await collection().retrieve();
    await syncMissingFields(schema);
  } catch (error: unknown) {
    if (getHttpStatus(error) !== 404) {
      throw error;
    }
    try {
      await typesenseClient.collections().create(MISSION_COLLECTION_SCHEMA);
    } catch (createError: unknown) {
      if (getHttpStatus(createError) !== 409) {
        throw createError;
      }
      const schema = await collection().retrieve();
      await syncMissingFields(schema);
    }
  }
};

export async function ensureMissionCollection(): Promise<void> {
  ensureMissionCollectionPromise ??= ensureMissionCollectionOnce().catch((error) => {
    ensureMissionCollectionPromise = null;
    throw error;
  });
  await ensureMissionCollectionPromise;
}
