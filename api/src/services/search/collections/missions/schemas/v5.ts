import type { SearchCollectionSchema } from "@/services/search/types";

import missionSchemaV4 from "./v4";

// Snapshot statique des champs indexés à l'instant de la v5.
// Ajouts par rapport à la v4 : champs nécessaires à la recherche et aux facettes du widget.
// `distributionPublisherIds` est hérité de la v4.
// Pour ajouter/retirer des champs, créer un v6.ts — ne pas modifier ce fichier.

const schema: SearchCollectionSchema = {
  ...missionSchemaV4,
  fields: [
    ...(missionSchemaV4.fields ?? []),
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
  ],
};

export default schema;
