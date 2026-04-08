import { mistral } from "@ai-sdk/mistral";

export const VERSION = "v1";
export const MODEL = mistral("mistral-large-latest");

export type TaxonomyForPrompt = Array<{
  key: string;
  label: string;
  type: string;
  values: Array<{ key: string; label: string }>;
}>;

export type MissionForPrompt = {
  title: string;
  description: string | null;
  tasks: string[];
  audience: string[];
  softSkills: string[];
  requirements: string[];
  tags: string[];
  type: string | null;
  remote: string | null;
  openToMinors: boolean | null;
  reducedMobilityAccessible: boolean | null;
  duration: number | null;
  startAt: Date | null;
  endAt: Date | null;
  schedule: string | null;
  domainName: string | null;
  activities: string[];
  organizationName: string | null;
  organizationType: string | null;
  organizationDescription: string | null;
  organizationActions: string[];
  organizationBeneficiaries: string[];
  organizationParentOrganizations: string[];
  organizationObject: string | null;
  organizationSocialObject1: string | null;
  organizationSocialObject2: string | null;
};

const formatDate = (date: Date): string => date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });

export const buildSystemPrompt = (taxonomy: TaxonomyForPrompt): string => {
  const dimensionsBlock = taxonomy.map((dim) => `### ${dim.key} — ${dim.label} (type: ${dim.type})\n${dim.values.map((v) => `- ${v.key} : ${v.label}`).join("\n")}`).join("\n\n");

  return `Tu es un classificateur de missions d'engagement bénévole et civique.

Ta tâche est d'analyser une mission et de la classifier selon un référentiel taxonomique fermé.

## Règles fondamentales

1. Tu ne dois utiliser QUE les \`value_key\` fournis dans la taxonomie ci-dessous.
   N'invente jamais de valeur hors référentiel.

2. Une mission peut recevoir plusieurs valeurs pour une même dimension (dimensions multi-valeurs).
   Pour les dimensions de type \`categorical\`, retourne au plus UNE valeur.

3. N'attribue une valeur que si tu en es raisonnablement certain (confidence ≥ 0.3).
   Mieux vaut omettre une valeur douteuse que d'en inventer une.

4. Certaines dimensions ne s'appliquent qu'à des cas spécifiques :
   - \`engagement_civique\` : uniquement pour des missions liées à l'armée, aux pompiers,
     à la gendarmerie ou à la police. Ne l'utilise pas pour du bénévolat associatif classique.
   - \`region_internationale\` : uniquement si la mission se déroule explicitement à l'étranger.

5. Pour l'evidence, fournis :
   - \`extract\` : un extrait textuel LITTÉRAL tiré du texte de la mission (titre, description, tâches…)
   - \`reasoning\` : une phrase courte expliquant pourquoi cet extrait justifie la classification

## Taxonomie active

--- DÉBUT TAXONOMIE ---
${dimensionsBlock}
--- FIN TAXONOMIE ---

## Format de sortie

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après.
Structure attendue :

{
  "classifications": [
    {
      "dimension_key": "<dimension_key>",
      "value_key": "<value_key>",
      "confidence": <0.0 à 1.0>,
      "evidence": {
        "extract": "<extrait littéral du texte de la mission>",
        "reasoning": "<explication courte>"
      }
    }
  ]
}

Si aucune valeur n'est applicable pour une dimension, ne l'inclus pas dans le tableau.`;
};

export const buildUserMessage = (mission: MissionForPrompt): string => {
  const lines: string[] = [];

  lines.push("## Mission à classifier");
  lines.push("");
  lines.push(`**Titre :** ${mission.title}`);
  lines.push("");
  lines.push(`**Type de mission :** ${mission.type ?? "non précisé"}`);

  const remoteLabel = mission.remote === "full" ? "Entièrement à distance" : mission.remote === "possible" ? "Présentiel avec option à distance" : "Présentiel";
  lines.push(`**Format :** ${remoteLabel}`);

  lines.push(`**Ouverte aux mineurs :** ${mission.openToMinors === true ? "Oui" : mission.openToMinors === false ? "Non" : "Non précisé"}`);
  lines.push(`**Accessible PMR :** ${mission.reducedMobilityAccessible === true ? "Oui" : mission.reducedMobilityAccessible === false ? "Non" : "Non précisé"}`);

  const durationStr = mission.duration ? `${mission.duration} heures` : "non précisée";
  const scheduleStr = mission.schedule ? ` — ${mission.schedule}` : "";
  lines.push(`**Durée :** ${durationStr}${scheduleStr}`);

  if (mission.startAt || mission.endAt) {
    const startStr = mission.startAt ? `du ${formatDate(mission.startAt)}` : "";
    const endStr = mission.endAt ? `au ${formatDate(mission.endAt)}` : "";
    lines.push(`**Dates :** ${startStr} ${endStr}`.trim());
  }

  lines.push("");
  lines.push(`**Domaine (classification existante) :** ${mission.domainName ?? "aucun"}`);
  lines.push(`**Activités associées :** ${mission.activities.length ? mission.activities.join(", ") : "aucune"}`);
  lines.push(`**Tags :** ${mission.tags.length ? mission.tags.join(", ") : "aucun"}`);

  lines.push("");
  lines.push("**Description :**");
  lines.push(mission.description ?? "aucune");

  if (mission.tasks.length) {
    lines.push("");
    lines.push("**Tâches :**");
    lines.push(mission.tasks.join("\n"));
  }

  if (mission.audience.length) {
    lines.push("");
    lines.push("**Public cible :**");
    lines.push(mission.audience.join("\n"));
  }

  if (mission.softSkills.length) {
    lines.push("");
    lines.push("**Compétences souhaitées :**");
    lines.push(mission.softSkills.join("\n"));
  }

  if (mission.requirements.length) {
    lines.push("");
    lines.push("**Prérequis :**");
    lines.push(mission.requirements.join("\n"));
  }

  // Organisation porteuse
  if (mission.organizationName) {
    lines.push("");
    lines.push("## Organisation porteuse");
    lines.push("");
    lines.push(`**Nom :** ${mission.organizationName}`);
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
