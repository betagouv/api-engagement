import { mistral } from "@ai-sdk/mistral";

export const VERSION = "v1";
export const MODEL = mistral("mistral-small-2503");

export const buildSystemPrompt = (taxonomyBlock: string): string => `\
Tu es un classificateur de missions d'engagement bénévole et civique.

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
${taxonomyBlock}
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

export const buildUserMessage = (missionBlock: string): string => `\
## Mission à classifier

${missionBlock}`;
