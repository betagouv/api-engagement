import type { TaxonomyKey } from "@engagement/taxonomy";

import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import type { SearchCollectionSchema } from "@/services/search/types";

// Snapshot statique des champs indexés à l'instant de la v5.
// Pour ajouter ou retirer des champs, créer un v6.ts — ne pas modifier ce fichier.
export const MISSION_TAXONOMY_FIELDS_V5: TaxonomyKey[] = ["domaine", "secteur_activite", "type_mission", "tranche_age", "dispositif"];
const taxonomyFields = MISSION_TAXONOMY_FIELDS_V5;

const schema: SearchCollectionSchema = {
  name: TYPESENSE_MISSION_COLLECTION,
  fields: [
    { name: "publisherId", type: "string", facet: true },
    { name: "publisherOrganizationId", type: "string", facet: true, optional: true },
    { name: "publisherOrganizationClientId", type: "string", facet: true, optional: true },
    { name: "publisherOrganizationParentOrganizations", type: "string[]", facet: true, optional: true },
    { name: "departmentCodes", type: "string[]", facet: true },
    { name: "distributionPublisherIds", type: "string[]", facet: true, optional: true },
    { name: "moderationAcceptedPublisherIds", type: "string[]", optional: true },
    { name: "publisherOrganizationFacet", type: "string", facet: true, optional: true },
    { name: "title", type: "string", optional: true },
    { name: "mission_domain", type: "string", facet: true, optional: true },
    { name: "departmentNames", type: "string[]", facet: true, optional: true },
    { name: "cityNames", type: "string[]", optional: true },
    { name: "postalCodes", type: "string[]", optional: true },
    { name: "regionNames", type: "string[]", optional: true },
    { name: "countryCodes", type: "string[]", facet: true, optional: true },
    { name: "locations", type: "geopoint[]", optional: true },
    { name: "remote", type: "string", facet: true, optional: true },
    { name: "schedule", type: "string", facet: true, optional: true },
    { name: "duration", type: "int32", optional: true },
    { name: "startAt", type: "int64", optional: true },
    { name: "createdAt", type: "int64", optional: true },
    { name: "openToMinors", type: "bool", facet: true, optional: true },
    { name: "reducedMobilityAccessible", type: "bool", facet: true, optional: true },
    { name: "closeToTransport", type: "bool", facet: true, optional: true },
    { name: "tasks", type: "string[]", facet: true, optional: true },
    { name: "audience", type: "string[]", facet: true, optional: true },
    { name: "tags", type: "string[]", optional: true },
    { name: "activities", type: "string[]", optional: true },
    ...taxonomyFields.map((name) => ({ name, type: "string[]" as const, facet: true, optional: true })),
  ],
};

export default schema;
