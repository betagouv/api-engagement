// Date et heure en français, fuseau Europe/Paris (ex. « 23 octobre 2026 à 14:30 »).
export const formatDate = (date: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(date);
