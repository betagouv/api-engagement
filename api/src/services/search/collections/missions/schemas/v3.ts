import type { TaxonomyKey } from "@engagement/taxonomy";

import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import type { SearchCollectionSchema } from "@/services/search/types";

import { MISSION_TAXONOMY_FIELDS_V1 } from "./v1";

// Snapshot statique des champs indexés à l'instant de la v3.
// Ajout par rapport à la v2 : la taxonomie `dispositif`.
// Pour ajouter/retirer des champs, créer un v4.ts — ne pas modifier ce fichier.
export const MISSION_TAXONOMY_FIELDS_V3: TaxonomyKey[] = [...MISSION_TAXONOMY_FIELDS_V1, "dispositif"];
const taxonomyFields = MISSION_TAXONOMY_FIELDS_V3;

const schema: SearchCollectionSchema = {
  name: TYPESENSE_MISSION_COLLECTION,
  fields: [
    { name: "publisherId", type: "string", facet: true },
    { name: "publisherOrganizationId", type: "string", facet: true, optional: true },
    { name: "publisherOrganizationClientId", type: "string", facet: true, optional: true },
    { name: "publisherOrganizationParentOrganizations", type: "string[]", facet: true, optional: true },
    { name: "departmentCodes", type: "string[]", facet: true },
    ...taxonomyFields.map((name) => ({ name, type: "string[]" as const, facet: true, optional: true })),
  ],
};

export default schema;
