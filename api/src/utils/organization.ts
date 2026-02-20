export const isValidRNA = (rna: string): boolean => Boolean(rna && rna.length === 10 && rna.startsWith("W") && /^[W0-9]+$/.test(rna));
export const isValidSiret = (siret: string): boolean => Boolean(siret && siret.length === 14 && /^[0-9]+$/.test(siret));

export const buildOrganizationSearchText = (title?: string | null, shortTitle?: string | null): string | null => {
  const parts = [title, shortTitle]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  if (!parts.length) {
    return null;
  }

  const combined = parts.join(" ").replace(/\s+/g, " ").trim();
  return combined.length ? combined : null;
};
