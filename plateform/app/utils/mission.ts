import type { MissionDetailCompensation } from "~/types/api";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function formatStartDate(startAt: string | null, duration: number | null): string | null {
  if (!startAt && !duration) return null;
  const parts: string[] = [];
  if (duration != null) parts.push(`${duration} mois`);
  if (startAt) {
    const d = new Date(startAt);
    parts.push(`à partir du ${d.getDate()} ${MONTHS[d.getMonth()]}`);
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

export function formatCompensation(compensation: MissionDetailCompensation): string | null {
  if (compensation.amount == null) return null;
  const amount = compensation.amountMax ? `${compensation.amount} – ${compensation.amountMax}` : `${compensation.amount}`;
  const unit = compensation.unit ? ` par ${UNIT_LABELS[compensation.unit] ?? compensation.unit}` : "";
  const type = compensation.type === "brut" || compensation.type === "net" ? ` ${compensation.type}` : "";
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
