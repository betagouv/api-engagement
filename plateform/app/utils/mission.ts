import type { MissionDetailCompensation } from "~/types/mission-detail";

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

export function formatCompensation(compensation: MissionDetailCompensation): string | null {
  if (compensation.amount == null) return null;
  const amount = compensation.amountMax ? `${compensation.amount} – ${compensation.amountMax}` : `${compensation.amount}`;
  const unit = compensation.unit ? ` € par ${compensation.unit}` : " €";
  return `${amount}${unit}`;
}

export function buildGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
