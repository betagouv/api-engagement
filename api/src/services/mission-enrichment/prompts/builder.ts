import { PROMPT_ARRAY_MAX_ITEMS, PROMPT_FIELD_MAX_LENGTH } from "@/services/mission-enrichment/config";
import { sanitizeForPrompt } from "@/utils/llm";
import type { MissionForPrompt, TaxonomyForPrompt } from "./types";

/**
 * Champs de mission dont une modification justifie de relancer le traitement
 * d'enrichissement/scoring/indexation.
 *
 * La majorité est consommée par `buildMissionBlock` ci-dessous. `addresses` est
 * volontairement inclus même s'il n'est pas envoyé au prompt : `mission.index`
 * utilise les `departmentCode` des adresses pour construire le document de recherche.
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
  "addresses",
  "audience",
  "softSkills",
  "requirements",
  "publisherOrganizationId",
] as const;

export type EnrichmentTriggerField = (typeof ENRICHMENT_TRIGGER_FIELDS)[number];

const formatDate = (date: Date): string => date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });

const boolLabel = (value: boolean | null): string => (value === true ? "Oui" : value === false ? "Non" : "Non précisé");

// Neutralise un champ texte non fiable (cf. sanitizeForPrompt) avant injection dans le prompt.
const clean = (value: string | null, maxLength: number): string => (value ? sanitizeForPrompt(value, maxLength) : "");

// Neutralise et plafonne un champ de type tableau (nombre d'éléments + longueur de chacun).
const cleanList = (values: string[], maxLength: number): string[] =>
  values
    .slice(0, PROMPT_ARRAY_MAX_ITEMS)
    .map((value) => sanitizeForPrompt(value, maxLength))
    .filter((value) => value.length > 0);

export const buildTaxonomyBlock = (taxonomy: TaxonomyForPrompt): string =>
  taxonomy.map((dim) => `### ${dim.key} — ${dim.label} (type: ${dim.type})\n` + dim.values.map((v) => `- ${v.key} : ${v.label}`).join("\n")).join("\n\n");

export const buildMissionBlock = (mission: MissionForPrompt): string => {
  const lines: string[] = [];

  const remoteLabel = mission.remote === "full" ? "Entièrement à distance" : mission.remote === "possible" ? "Présentiel avec option à distance" : "Présentiel";

  const durationStr = mission.duration ? `${mission.duration} heures` : "non précisée";
  const cleanSchedule = clean(mission.schedule, PROMPT_FIELD_MAX_LENGTH.short);
  const scheduleStr = cleanSchedule ? ` — ${cleanSchedule}` : "";

  const cleanType = clean(mission.type, PROMPT_FIELD_MAX_LENGTH.short);
  const cleanActivities = cleanList(mission.activities, PROMPT_FIELD_MAX_LENGTH.short);
  const cleanTags = cleanList(mission.tags, PROMPT_FIELD_MAX_LENGTH.short);

  lines.push(
    `**Titre :** ${clean(mission.title, PROMPT_FIELD_MAX_LENGTH.title)}`,
    `**Type de mission :** ${cleanType || "non précisé"}`,
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
    `**Domaine (classification existante) :** ${clean(mission.domainName, PROMPT_FIELD_MAX_LENGTH.short) || "aucun"}`,
    `**Activités associées :** ${cleanActivities.length ? cleanActivities.join(", ") : "aucune"}`,
    `**Tags :** ${cleanTags.length ? cleanTags.join(", ") : "aucun"}`,
    "",
    "**Description :**",
    clean(mission.description, PROMPT_FIELD_MAX_LENGTH.description) || "aucune"
  );

  const cleanTasks = cleanList(mission.tasks, PROMPT_FIELD_MAX_LENGTH.short);
  if (cleanTasks.length) {
    lines.push("", "**Tâches :**", cleanTasks.join("\n"));
  }
  const cleanAudience = cleanList(mission.audience, PROMPT_FIELD_MAX_LENGTH.short);
  if (cleanAudience.length) {
    lines.push("", "**Public cible :**", cleanAudience.join("\n"));
  }
  const cleanSoftSkills = cleanList(mission.softSkills, PROMPT_FIELD_MAX_LENGTH.short);
  if (cleanSoftSkills.length) {
    lines.push("", "**Compétences souhaitées :**", cleanSoftSkills.join("\n"));
  }
  const cleanRequirements = cleanList(mission.requirements, PROMPT_FIELD_MAX_LENGTH.short);
  if (cleanRequirements.length) {
    lines.push("", "**Prérequis :**", cleanRequirements.join("\n"));
  }

  const cleanOrgName = clean(mission.organizationName, PROMPT_FIELD_MAX_LENGTH.short);
  if (cleanOrgName) {
    lines.push("", "## Organisation porteuse", "", `**Nom :** ${cleanOrgName}`);
    lines.push(`**Type :** ${clean(mission.organizationType, PROMPT_FIELD_MAX_LENGTH.short) || "non renseigné"}`);
    const cleanOrgDescription = clean(mission.organizationDescription, PROMPT_FIELD_MAX_LENGTH.org);
    if (cleanOrgDescription) {
      lines.push(`**Description :** ${cleanOrgDescription}`);
    }
    const cleanOrgActions = cleanList(mission.organizationActions, PROMPT_FIELD_MAX_LENGTH.short);
    if (cleanOrgActions.length) {
      lines.push(`**Actions :** ${cleanOrgActions.join(", ")}`);
    }
    const cleanOrgBeneficiaries = cleanList(mission.organizationBeneficiaries, PROMPT_FIELD_MAX_LENGTH.short);
    if (cleanOrgBeneficiaries.length) {
      lines.push(`**Bénéficiaires :** ${cleanOrgBeneficiaries.join(", ")}`);
    }
    const cleanOrgParents = cleanList(mission.organizationParentOrganizations, PROMPT_FIELD_MAX_LENGTH.short);
    if (cleanOrgParents.length) {
      lines.push(`**Organisations parentes :** ${cleanOrgParents.join(", ")}`);
    }
    const cleanOrgObject = clean(mission.organizationObject, PROMPT_FIELD_MAX_LENGTH.org);
    if (cleanOrgObject) {
      lines.push(`**Objet social :** ${cleanOrgObject}`);
    }
    const cleanOrgSocial1 = clean(mission.organizationSocialObject1, PROMPT_FIELD_MAX_LENGTH.org);
    if (cleanOrgSocial1) {
      lines.push(`**Objet social 1 :** ${cleanOrgSocial1}`);
    }
    const cleanOrgSocial2 = clean(mission.organizationSocialObject2, PROMPT_FIELD_MAX_LENGTH.org);
    if (cleanOrgSocial2) {
      lines.push(`**Objet social 2 :** ${cleanOrgSocial2}`);
    }
  }

  return lines.join("\n");
};
