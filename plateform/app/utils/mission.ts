import type { MissionBrowse, MissionDetailCompensation, MissionMatchItem } from "@engagement/dto";

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

export function formatCompensation(compensation: MissionDetailCompensation): string | null {
  if (compensation.amount == null) return null;
  const amount = compensation.amountMax ? `${compensation.amount} – ${compensation.amountMax}` : `${compensation.amount}`;
  const unit = compensation.unit ? ` par ${UNIT_LABELS[compensation.unit] ?? compensation.unit}` : "";
  const type = compensation.type ? ` ${COMPENSATION_TYPE_LABELS[compensation.type] ?? compensation.type}` : "";
  return `${amount}€${type}${unit}`;
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

export function matchResultToBrowseMission(item: MissionMatchItem): MissionBrowse {
  return {
    id: item.mission.id,
    title: item.mission.title,
    description: null,
    city: item.mission.location.city,
    departmentCode: null,
    departmentName: null,
    domain: item.mission.domain,
    domainOriginal: item.mission.domainOriginal ?? null,
    domainLogo: item.mission.media.domainLogo,
    organizationName: item.mission.organizationName,
    organizationLogo: item.mission.media.organizationLogo,
    photo: item.mission.media.photo,
    publisherName: item.mission.publisherName,
    publisherLogo: item.mission.media.publisherLogo,
    applicationUrl: null,
    schedule: item.mission.schedule,
  };
}
