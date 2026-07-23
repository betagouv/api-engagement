import type { TaxonomyKey } from "@engagement/taxonomy";

import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import type { SearchCollectionSchema } from "@/services/search/types";

// Snapshot statique et autonome des champs indexés à l'instant de la v4 (aucune dépendance aux
// versions précédentes). Ajout par rapport à la v3 : `distributionPublisherIds` (diffuseurs autorisés
// par le snapshot mission_diffusion). Pour ajouter/retirer des champs, créer un v5.ts — ne pas modifier
// ce fichier.
export const MISSION_TAXONOMY_FIELDS_V4: TaxonomyKey[] = ["domaine", "secteur_activite", "type_mission", "tranche_age", "dispositif"];
const taxonomyFields = MISSION_TAXONOMY_FIELDS_V4;

const schema: SearchCollectionSchema = {
  name: TYPESENSE_MISSION_COLLECTION,
  fields: [
    { name: "publisherId", type: "string", facet: true },
    { name: "publisherOrganizationId", type: "string", facet: true, optional: true },
    { name: "publisherOrganizationClientId", type: "string", facet: true, optional: true },
    { name: "publisherOrganizationParentOrganizations", type: "string[]", facet: true, optional: true },
    { name: "departmentCodes", type: "string[]", facet: true },
    { name: "distributionPublisherIds", type: "string[]", facet: true, optional: true },
    ...taxonomyFields.map((name) => ({ name, type: "string[]" as const, facet: true, optional: true })),
  ],
};

export default schema;
