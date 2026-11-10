import { getMissionCardTag } from "./utils";

// Règles d'affichage d'une carte mission, partagées par la plateforme et les emails de l'API
// pour que le jeune retrouve la même carte sur le site et dans le mail.

export type MissionCardCompensation = {
  amount: number | null;
  amountMax: number | null;
  unit: string | null;
  type?: string | null;
};

export type MissionCardInfo = {
  remote: string | null;
  city: string | null;
  schedule: string | null;
  compensation: MissionCardCompensation | null;
};

export type MissionCardMatch = {
  taxonomyScores: Record<string, number>;
  values: Array<{ taxonomyKey: string; taxonomyValueKey: string }>;
  geoScore: number | null;
};

const UNIT_LABELS: Record<string, string> = {
  month: "mois",
  hour: "heure",
  day: "jour",
  week: "semaine",
  year: "an",
  mois: "mois",
  heure: "heure",
  jour: "jour",
  semaine: "semaine",
  an: "an",
};

const COMPENSATION_TYPE_LABELS: Record<string, string> = {
  gross: "brut",
  net: "net",
};

// Espace insécable avant le symbole, pour que « 119 € » ne soit jamais coupé en fin de ligne.
const formatEuros = (amount: number) => `${amount}\u00a0€`;

export function formatCompensation(compensation: MissionCardCompensation, options?: { withType?: boolean; compact?: boolean }): string | null {
  if (compensation.amount == null) return null;
  const amount =
    compensation.amountMax != null
      ? compensation.amount === 0
        ? `Jusqu'à ${formatEuros(compensation.amountMax)}`
        : `Entre ${formatEuros(compensation.amount)} et ${formatEuros(compensation.amountMax)}`
      : formatEuros(compensation.amount);
  const type = options?.withType && compensation.type ? ` ${COMPENSATION_TYPE_LABELS[compensation.type] ?? compensation.type}` : "";
  const unitLabel = compensation.unit ? (UNIT_LABELS[compensation.unit] ?? compensation.unit) : null;
  const unit = unitLabel ? (options?.compact ? `/${unitLabel}` : ` par ${unitLabel}`) : "";
  return `${amount}${type}${unit}`;
}

/**
 * Tags d'une mission hors matching (liste /missions, landings, mail d'une mission) : lieu, rythme et indemnité.
 */
export function buildMissionBrowseTags(mission: MissionCardInfo): string[] {
  const location = mission.remote === "local" ? "Près de chez moi" : mission.remote === "full" ? "À distance" : mission.city;
  const compensation = mission.compensation ? formatCompensation(mission.compensation) : null;
  return [location, mission.schedule, compensation].filter((tag): tag is string => Boolean(tag));
}

// Score géo minimal pour considérer la mission comme proche et afficher sa ville en tag.
const GEO_SCORE_TAG_THRESHOLD = 0.8;
// Une carte affiche entre 5 et 6 tags : en dessous du minimum, les tags de matching sont complétés
// par les tags standards (lieu, rythme, indemnité).
const MIN_CARD_TAGS = 5;
const MAX_CARD_TAGS = 6;

/**
 * Tags résumant pourquoi une mission a matché (page résultats, mail de sélection) : pour chaque taxonomie avec un
 * score positif, les tags des valeurs à la fois demandées par l'utilisateur (`userValueKeys`, clés plates
 * "taxonomie.valeur") et portées par la mission, ordonnés par score de taxonomie décroissant, avec la ville quand le
 * score géo est haut. Les valeurs sans `mission_card_tag` sont ignorées. Quand le matching en produit moins de
 * `MIN_CARD_TAGS`, la carte est complétée par les tags standards (cf. buildMissionBrowseTags).
 */
export function buildMissionMatchTags(match: MissionCardMatch, mission: MissionCardInfo, userValueKeys: ReadonlySet<string>): string[] {
  const entries: { score: number; tags: string[] }[] = [];

  for (const [taxonomyKey, score] of Object.entries(match.taxonomyScores)) {
    if (score <= 0) continue;

    const tags = match.values
      .filter((value) => value.taxonomyKey === taxonomyKey && userValueKeys.has(`${value.taxonomyKey}.${value.taxonomyValueKey}`))
      .map((value) => getMissionCardTag(value.taxonomyKey, value.taxonomyValueKey))
      .filter((tag): tag is string => tag !== null);
    if (tags.length > 0) entries.push({ score, tags });
  }

  if (match.geoScore !== null && match.geoScore >= GEO_SCORE_TAG_THRESHOLD && mission.city) {
    entries.push({ score: match.geoScore, tags: [mission.city] });
  }

  entries.sort((a, b) => b.score - a.score);
  const matchTags = [...new Set(entries.flatMap((entry) => entry.tags))].slice(0, MAX_CARD_TAGS);
  if (matchTags.length >= MIN_CARD_TAGS) return matchTags;

  return [...new Set([...matchTags, ...buildMissionBrowseTags(mission)])].slice(0, MAX_CARD_TAGS);
}
