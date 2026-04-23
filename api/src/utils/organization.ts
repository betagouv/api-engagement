export const isValidRNA = (rna: string): boolean => Boolean(rna && rna.length === 10 && rna.startsWith("W") && /^[W0-9]+$/.test(rna));
export const isValidSiret = (siret: string): boolean => Boolean(siret && siret.length === 14 && /^[0-9]+$/.test(siret));
export const isValidSiren = (siren: string): boolean => Boolean(siren && siren.length === 9 && /^[0-9]+$/.test(siren));
export const ORGANIZATION_FTS_MIN_TOKEN_LENGTH = 3;

const normalizeString = (value?: unknown | null) => (value?.toString() || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
const normalizeSearchString = (value?: string | null) => {
  const normalized = (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length ? normalized : null;
};

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

export const normalizeOrganizationSearchQuery = (value?: string | null) => normalizeSearchString(value);
export const tokenizeOrganizationSearchQuery = (value?: string | null, minTokenLength = ORGANIZATION_FTS_MIN_TOKEN_LENGTH): string[] => {
  const normalized = normalizeOrganizationSearchQuery(value);
  if (!normalized) {
    return [];
  }

  return Array.from(new Set(normalized.split(" ").filter((token) => token.length >= minTokenLength)));
};

export const buildOrganizationPrefixTsQuery = (value?: string | null, minTokenLength = ORGANIZATION_FTS_MIN_TOKEN_LENGTH): string | null => {
  const tokens = tokenizeOrganizationSearchQuery(value, minTokenLength);
  if (!tokens.length) {
    return null;
  }

  return tokens.map((token) => `${token}:*`).join(" & ");
};

type OrganizationSearchTextInput = {
  title?: string | null;
  shortTitle?: string | null;
  rna?: string | null;
  siret?: string | null;
  siren?: string | null;
};

export const buildOrganizationSearchText = ({ title, shortTitle, rna, siret, siren }: OrganizationSearchTextInput): string | null => {
  const parts = [title, shortTitle, rna, siret, siren].map((value) => normalizeSearchString(typeof value === "string" ? value : null)).filter((value): value is string => Boolean(value));

  if (!parts.length) {
    return null;
  }

  return parts.join(" ");
};
