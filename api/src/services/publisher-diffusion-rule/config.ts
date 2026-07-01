import type { Prisma } from "@/db/core";

// Polarité normalisée d'une règle enfant : inclusion (`is`) ou exclusion (`isNot`).
export type ChildPolarity = "is" | "isNot";

export type ChildFieldConfig = {
  // Champ correspondant dans l'index de recherche (cf. `schemas/`).
  indexField: string;
  // Opérateurs de règle acceptés, regroupés par polarité ; tout autre opérateur est non supporté.
  operators: Record<ChildPolarity, readonly string[]>;
  // Condition Prisma équivalente, pour chaque polarité.
  missionWhere: Record<ChildPolarity, (value: string) => Prisma.MissionWhereInput>;
};

// Registre des champs enfants supportés par le filtre de diffusion.
// Ajouter un champ = ajouter une entrée ici (et le champ correspondant dans le schéma d'index).
export const SUPPORTED_CHILD_FIELDS: Record<string, ChildFieldConfig> = {
  // Conservé pour les règles historiques stockées sur l'id d'organisation : le champ reste indexé, le support coûte peu.
  publisherOrganizationId: {
    indexField: "publisherOrganizationId",
    operators: { is: ["is"], isNot: ["is_not"] },
    missionWhere: {
      is: (value) => ({ publisherOrganizationId: value }),
      isNot: (value) => ({ publisherOrganizationId: { not: value } }),
    },
  },
  "publisherOrganization.clientId": {
    indexField: "publisherOrganizationClientId",
    operators: { is: ["is"], isNot: ["is_not"] },
    missionWhere: {
      is: (value) => ({ publisherOrganization: { clientId: value } }),
      isNot: (value) => ({ publisherOrganization: { clientId: { not: value } } }),
    },
  },
  // Champ array indexé : appartenance exacte, donc `contains` ≡ `is` et `does_not_contain` ≡ `is_not`.
  "publisherOrganization.parentOrganizations": {
    indexField: "publisherOrganizationParentOrganizations",
    operators: { is: ["is", "contains"], isNot: ["is_not", "does_not_contain"] },
    missionWhere: {
      is: (value) => ({ publisherOrganization: { parentOrganizations: { has: value } } }),
      isNot: (value) => ({ NOT: { publisherOrganization: { parentOrganizations: { has: value } } } }),
    },
  },
};
