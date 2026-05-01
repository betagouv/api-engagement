import type { CollectionFieldSchema, CollectionSchema } from "typesense/lib/Typesense/Collection";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";

import { typesenseClient } from "./client";

const LOG_PREFIX = "[search:typesense]";

const assertCompatibleField = (collectionName: string, expected: CollectionFieldSchema, actual: CollectionFieldSchema): void => {
  const expectedFacet = expected.facet ?? false;
  const actualFacet = actual.facet ?? false;
  const expectedOptional = expected.optional ?? false;
  const actualOptional = actual.optional ?? false;

  if (actual.type !== expected.type || actualFacet !== expectedFacet || actualOptional !== expectedOptional) {
    throw new Error(
      `[search] Incompatible field '${expected.name}' in collection '${collectionName}' ` +
        `(expected type=${expected.type}, facet=${expectedFacet}, optional=${expectedOptional}; ` +
        `actual type=${actual.type}, facet=${actualFacet}, optional=${actualOptional})`
    );
  }
};

const syncMissingFields = async (schema: CollectionCreateSchema, existing: CollectionSchema): Promise<void> => {
  const existingFields = new Map(existing.fields.map((f) => [f.name, f]));
  const missingFields: CollectionFieldSchema[] = [];

  console.log(`${LOG_PREFIX} collection '${schema.name}' — champs attendus : [${(schema.fields ?? []).map((f) => f.name).join(", ")}]`);
  console.log(`${LOG_PREFIX} collection '${schema.name}' — champs existants : [${existing.fields.map((f) => f.name).join(", ")}]`);

  for (const expected of schema.fields ?? []) {
    const actual = existingFields.get(expected.name);
    if (!actual) {
      console.log(`${LOG_PREFIX} champ manquant : '${expected.name}' (${expected.type})`);
      missingFields.push(expected);
      continue;
    }
    assertCompatibleField(schema.name, expected, actual);
  }

  if (missingFields.length > 0) {
    console.log(`${LOG_PREFIX} ajout de ${missingFields.length} champ(s) : [${missingFields.map((f) => f.name).join(", ")}]`);
    await typesenseClient.collections(schema.name).update({ fields: missingFields });
    console.log(`${LOG_PREFIX} alter réussi`);
  } else {
    console.log(`${LOG_PREFIX} collection '${schema.name}' déjà à jour`);
  }
};

export const ensureCollection = async (schema: CollectionCreateSchema): Promise<void> => {
  const getHttpStatus = (error: unknown): number | undefined => (error as { httpStatus?: number }).httpStatus;

  console.log(`${LOG_PREFIX} vérification de la collection '${schema.name}'...`);

  try {
    const existing = await typesenseClient.collections(schema.name).retrieve();
    console.log(`${LOG_PREFIX} collection '${schema.name}' trouvée (${existing.num_documents} documents)`);
    await syncMissingFields(schema, existing);
  } catch (error: unknown) {
    if (getHttpStatus(error) !== 404) {throw error;}
    console.log(`${LOG_PREFIX} collection '${schema.name}' absente — création...`);
    try {
      await typesenseClient.collections().create(schema);
      console.log(`${LOG_PREFIX} collection '${schema.name}' créée`);
    } catch (createError: unknown) {
      if (getHttpStatus(createError) !== 409) {throw createError;}
      console.log(`${LOG_PREFIX} création concurrente détectée — synchronisation des champs...`);
      const existing = await typesenseClient.collections(schema.name).retrieve();
      await syncMissingFields(schema, existing);
    }
  }
};
