// Date et heure en français, fuseau Europe/Paris (ex. « 23 octobre 2026 à 14:30 »).
export const formatDate = (date: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(date);

// Date au format MM/DD/YYYY (UTC), ex. « 01/05/2025 ».
export const formatDateMMDDYYYY = (date: Date | string) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(new Date(date));
