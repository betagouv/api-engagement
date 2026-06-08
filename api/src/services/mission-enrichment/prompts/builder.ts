import type { MissionForPrompt, TaxonomyForPrompt } from "./types";

/**
 * Champs de mission (clés du diff d'import, cf. `IMPORT_FIELDS_TO_COMPARE` dans
 * `src/utils/mission.ts`) réellement consommés par `buildMissionBlock` ci-dessous et dont
 * une modification justifie un ré-enrichissement.
 *
 * Source de vérité unique du gate de ré-enrichissement à l'import
 * (cf. `src/jobs/import-missions/utils/db.ts`). À garder synchronisée avec `buildMissionBlock` :
 * un champ ajouté/retiré du prompt doit l'être ici aussi (un test garantit que cette liste
 * reste un sous-ensemble de `IMPORT_FIELDS_TO_COMPARE`).
 *
 * Exclus volontairement bien que rendus dans le prompt :
 * - `startAt`/`endAt` : décalés chaque jour par les flux (bruit, sans impact sur la classification).
 * - `duration` : dérivée des dates (`getMonthDifference(startAt, endAt)`), aucun signal propre.
 * Les données d'organisation (nom/type/description/actions…) entrent dans le prompt via la
 * relation `publisherOrganizationId`. Limitation connue : une modification de contenu de
 * l'organisation rattachée ne déclenche pas à elle seule un ré-enrichissement des missions.
 */
export const ENRICHMENT_TRIGGER_FIELDS = [
  "title",
  "description",
  "type",
  "remote",
  "openToMinors",
  "reducedMobilityAccessible",
  "schedule",
  "domain",
  "activities",
  "tags",
  "tasks",
  "audience",
  "softSkills",
  "requirements",
  "publisherOrganizationId",
] as const;

export type EnrichmentTriggerField = (typeof ENRICHMENT_TRIGGER_FIELDS)[number];

const formatDate = (date: Date): string => date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });

const boolLabel = (value: boolean | null): string => (value === true ? "Oui" : value === false ? "Non" : "Non précisé");

export const buildTaxonomyBlock = (taxonomy: TaxonomyForPrompt): string =>
  taxonomy.map((dim) => `### ${dim.key} — ${dim.label} (type: ${dim.type})\n` + dim.values.map((v) => `- ${v.key} : ${v.label}`).join("\n")).join("\n\n");

export const buildMissionBlock = (mission: MissionForPrompt): string => {
  const lines: string[] = [];

  const remoteLabel = mission.remote === "full" ? "Entièrement à distance" : mission.remote === "possible" ? "Présentiel avec option à distance" : "Présentiel";

  const durationStr = mission.duration ? `${mission.duration} heures` : "non précisée";
  const scheduleStr = mission.schedule ? ` — ${mission.schedule}` : "";

  lines.push(
    `**Titre :** ${mission.title}`,
    `**Type de mission :** ${mission.type ?? "non précisé"}`,
    `**Format :** ${remoteLabel}`,
    `**Ouverte aux mineurs :** ${boolLabel(mission.openToMinors)}`,
    `**Accessible PMR :** ${boolLabel(mission.reducedMobilityAccessible)}`,
    `**Durée :** ${durationStr}${scheduleStr}`
  );

  if (mission.startAt || mission.endAt) {
    const startStr = mission.startAt ? `du ${formatDate(mission.startAt)}` : "";
    const endStr = mission.endAt ? `au ${formatDate(mission.endAt)}` : "";
    lines.push(`**Dates :** ${[startStr, endStr].filter(Boolean).join(" ")}`);
  }

  lines.push(
    "",
    `**Domaine (classification existante) :** ${mission.domainName ?? "aucun"}`,
    `**Activités associées :** ${mission.activities.length ? mission.activities.join(", ") : "aucune"}`,
    `**Tags :** ${mission.tags.length ? mission.tags.join(", ") : "aucun"}`,
    "",
    "**Description :**",
    mission.description ?? "aucune"
  );

  if (mission.tasks.length) {
    lines.push("", "**Tâches :**", mission.tasks.join("\n"));
  }
  if (mission.audience.length) {
    lines.push("", "**Public cible :**", mission.audience.join("\n"));
  }
  if (mission.softSkills.length) {
    lines.push("", "**Compétences souhaitées :**", mission.softSkills.join("\n"));
  }
  if (mission.requirements.length) {
    lines.push("", "**Prérequis :**", mission.requirements.join("\n"));
  }

  if (mission.organizationName) {
    lines.push("", "## Organisation porteuse", "", `**Nom :** ${mission.organizationName}`);
    lines.push(`**Type :** ${mission.organizationType ?? "non renseigné"}`);
    if (mission.organizationDescription) {
      lines.push(`**Description :** ${mission.organizationDescription}`);
    }
    if (mission.organizationActions.length) {
      lines.push(`**Actions :** ${mission.organizationActions.join(", ")}`);
    }
    if (mission.organizationBeneficiaries.length) {
      lines.push(`**Bénéficiaires :** ${mission.organizationBeneficiaries.join(", ")}`);
    }
    if (mission.organizationParentOrganizations.length) {
      lines.push(`**Organisations parentes :** ${mission.organizationParentOrganizations.join(", ")}`);
    }
    if (mission.organizationObject) {
      lines.push(`**Objet social :** ${mission.organizationObject}`);
    }
    if (mission.organizationSocialObject1) {
      lines.push(`**Objet social 1 :** ${mission.organizationSocialObject1}`);
    }
    if (mission.organizationSocialObject2) {
      lines.push(`**Objet social 2 :** ${mission.organizationSocialObject2}`);
    }
  }

  return lines.join("\n");
};
