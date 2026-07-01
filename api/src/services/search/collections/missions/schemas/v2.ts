import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import type { SearchCollectionSchema } from "@/services/search/types";

import { MISSION_TAXONOMY_FIELDS_V1 } from "./v1";

// Snapshot statique des champs indexés à l'instant de la v2.
// Ajout par rapport à la v1 : `publisherOrganizationClientId`. Taxonomies inchangées (réutilise la v1).
// Pour ajouter/retirer des champs, créer un v3.ts — ne pas modifier ce fichier.
const taxonomyFields = MISSION_TAXONOMY_FIELDS_V1;

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
