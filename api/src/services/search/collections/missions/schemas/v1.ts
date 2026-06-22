import type { TaxonomyKey } from "@engagement/taxonomy";

import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import type { SearchCollectionSchema } from "@/services/search/types";

// Snapshot statique des champs indexés à l'instant de la v1.
// Pour ajouter/retirer des taxonomies, créer un v2.ts — ne pas modifier ce fichier.
export const MISSION_TAXONOMY_FIELDS_V1: TaxonomyKey[] = ["domaine", "secteur_activite", "type_mission", "tranche_age"];
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
