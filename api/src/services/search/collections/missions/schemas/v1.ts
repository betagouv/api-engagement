import type { TaxonomyKey } from "@engagement/taxonomy";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";

import { TYPESENSE_MISSION_COLLECTION } from "@/config";

// Snapshot statique des champs indexés à l'instant de la v1.
// Pour ajouter/retirer des taxonomies, créer un v2.ts — ne pas modifier ce fichier.
const taxonomyFields: TaxonomyKey[] = ["domaine", "secteur_activite", "type_mission", "tranche_age"];

const schema: CollectionCreateSchema = {
  name: TYPESENSE_MISSION_COLLECTION,
  fields: [
    { name: "publisherId", type: "string", facet: true },
    { name: "departmentCodes", type: "string[]", facet: true },
    ...taxonomyFields.map((name) => ({ name, type: "string[]" as const, facet: true, optional: true })),
  ],
};

export default schema;
