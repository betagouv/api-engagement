export const isValidRNA = (rna: string): boolean => Boolean(rna && rna.length === 10 && rna.startsWith("W") && /^[W0-9]+$/.test(rna));
export const isValidSiret = (siret: string): boolean => Boolean(siret && siret.length === 14 && /^[0-9]+$/.test(siret));
export const isValidSiren = (siren: string): boolean => Boolean(siren && siren.length === 9 && /^[0-9]+$/.test(siren));

const normalizeString = (value?: unknown | null) => (value?.toString() || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

export const normalizeRNA = (value?: unknown | null) => {
  const normalized = normalizeString(value);
  if (normalized && isValidRNA(normalized)) {
    return normalized;
  }
  return null;
};

export const normalizeSiret = (value?: unknown | null) => {
  const normalized = normalizeString(value);
  if (normalized && isValidSiret(normalized)) {
    return normalized;
  }
  return null;
};
export const normalizeName = (value?: unknown | null) => {
  const normalized = normalizeString(value);
  if (normalized) {
    return normalized;
  }
  return null;
};
