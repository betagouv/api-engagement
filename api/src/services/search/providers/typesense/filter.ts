const escapeSearchFilterValue = (value: string): string => {
  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
};

export const buildSearchEqualFilter = (field: string, value: string): string => `${field}:=${escapeSearchFilterValue(value)}`;

export const buildSearchNotEqualFilter = (field: string, value: string): string => `${field}:!=${escapeSearchFilterValue(value)}`;

export const buildSearchListFilter = (field: string, values: string[]): string => `${field}:=[${values.map(escapeSearchFilterValue).join(",")}]`;

export const combineSearchAnd = (parts: string[]): string => {
  if (parts.length === 1) {
    return parts[0];
  }
  return `(${parts.join(" && ")})`;
};

export const combineSearchOr = (parts: string[]): string => {
  if (parts.length === 1) {
    return parts[0];
  }
  return `(${parts.join(" || ")})`;
};
