import type { MissionBrowse, MissionDetailCompensation, MissionMatchItem } from "@engagement/dto";
import { getMissionCardTag } from "@engagement/taxonomy";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function formatStartDate(startAt: string | null, duration: number | null): string | null {
  if (!startAt && !duration) return null;
  const parts: string[] = [];
  if (duration != null) parts.push(`${duration} mois`);
  if (startAt) {
    const d = new Date(startAt);
    const prefix = duration != null ? "à" : "À";
    parts.push(`${prefix} partir du ${d.getDate()} ${MONTHS[d.getMonth()]}`);
  }
  return parts.join(" ") || null;
}

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

export function formatCompensation(compensation: MissionDetailCompensation, options?: { withType?: boolean; compact?: boolean }): string | null {
  if (compensation.amount == null) return null;
  const amount =
    compensation.amountMax != null
      ? compensation.amount === 0
        ? `Jusqu'à ${compensation.amountMax}€`
        : `Entre ${compensation.amount} et ${compensation.amountMax}€`
      : `${compensation.amount}€`;
  const type = options?.withType && compensation.type ? ` ${COMPENSATION_TYPE_LABELS[compensation.type] ?? compensation.type}` : "";
  const unitLabel = compensation.unit ? (UNIT_LABELS[compensation.unit] ?? compensation.unit) : null;
  const unit = unitLabel ? (options?.compact ? `/${unitLabel}` : ` par ${unitLabel}`) : "";
  return `${amount}${type}${unit}`;
}

const MISSION_TYPE_LABELS: Record<string, string> = {
  benevolat: "Mission de bénévolat",
  volontariat_service_civique: "Mission de Service Civique",
  volontariat: "Mission de volontariat",
  emploi: "Emploi",
  stage: "Stage",
};

export function formatMissionType(type: string | null): string {
  if (!type) return "Mission";
  return MISSION_TYPE_LABELS[type] ?? "Mission";
}

export function formatDeadline(endAt: string | null): string | null {
  if (!endAt) return null;
  const d = new Date(endAt);
  return `Candidatures ouvertes jusqu'au ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * Construit le lien vers la page détail d'une mission issue des résultats de matching.
 * Propage l'adresse qui a permis le match (`addressId`) afin que la page détail affiche
 * la bonne adresse quand la mission en a plusieurs.
 */
export function buildMissionDetailHref(item: MissionMatchItem, userScoringId?: string): string {
  const base = userScoringId ? `/results/${userScoringId}/missions/${item.mission.id}` : `/missions/${item.mission.id}`;
  const addressId = item.mission.location.addressId;
  return addressId ? `${base}?addressId=${encodeURIComponent(addressId)}` : base;
}

/**
 * Ajoute le contexte du quiz à une URL de redirection trackée vers l'annonceur.
 */
export function buildMissionApplicationHref(applicationUrl: string, userScoringId?: string): string {
  if (!userScoringId) return applicationUrl;

  const url = new URL(applicationUrl);
  url.searchParams.set("user_scoring_id", userScoringId);
  return url.toString();
}

// Score géo minimal pour considérer la mission comme proche et afficher sa ville en tag.
const GEO_SCORE_TAG_THRESHOLD = 0.8;
const MAX_MATCH_TAGS = 6;

/**
 * Construit les tags résumant pourquoi une mission a matché : pour chaque taxonomie avec un score
 * positif, les tags des valeurs à la fois demandées par l'utilisateur (`userValueKeys`, clés plates
 * "taxonomie.valeur") et portées par la mission, ordonnés par score de taxonomie décroissant, avec
 * la ville quand le score géo est haut. Les valeurs sans `mission_card_tag` sont ignorées.
 */
export function buildMissionMatchTags(item: MissionMatchItem, userValueKeys: ReadonlySet<string>): string[] {
  const entries: { score: number; tags: string[] }[] = [];

  for (const [taxonomyKey, score] of Object.entries(item.match.taxonomyScores)) {
    if (score <= 0) continue;

    const tags = item.match.values
      .filter((value) => value.taxonomyKey === taxonomyKey && userValueKeys.has(`${value.taxonomyKey}.${value.taxonomyValueKey}`))
      .map((value) => getMissionCardTag(value.taxonomyKey, value.taxonomyValueKey))
      .filter((tag): tag is string => tag !== null);
    if (tags.length > 0) entries.push({ score, tags });
  }

  const city = item.mission.location.city;
  if (item.match.geoScore !== null && item.match.geoScore >= GEO_SCORE_TAG_THRESHOLD && city) {
    entries.push({ score: item.match.geoScore, tags: [city] });
  }

  entries.sort((a, b) => b.score - a.score);
  return [...new Set(entries.flatMap((entry) => entry.tags))].slice(0, MAX_MATCH_TAGS);
}

export function matchResultToBrowseMission(item: MissionMatchItem): MissionBrowse {
  return {
    id: item.mission.id,
    title: item.mission.title,
    description: null,
    remote: item.mission.remote,
    city: item.mission.location.city,
    country: null,
    departmentCode: null,
    departmentName: null,
    domain: item.mission.domain,
    domainOriginal: item.mission.domainOriginal ?? null,
    domainLogo: item.mission.media.domainLogo,
    organizationName: item.mission.organizationName,
    organizationLogo: item.mission.media.organizationLogo,
    photo: item.mission.media.photo,
    publisherId: item.mission.publisherId,
    publisherName: item.mission.publisherName,
    publisherLogo: item.mission.media.publisherLogo,
    applicationUrl: null,
    schedule: item.mission.schedule,
    places: null,
    tags: [],
    addresses: [],
    compensation: item.mission.compensation,
  };
}
