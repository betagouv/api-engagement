const escapeSearchFilterValue = (value: string): string => {
  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
};

export const buildSearchEqualFilter = (field: string, value: string): string => `${field}:=${escapeSearchFilterValue(value)}`;

export const buildSearchNotEqualFilter = (field: string, value: string): string => `${field}:!=${escapeSearchFilterValue(value)}`;

export const buildSearchListFilter = (field: string, values: string[]): string => `${field}:=[${values.map(escapeSearchFilterValue).join(",")}]`;

export const buildSearchNotListFilter = (field: string, values: string[]): string => `${field}:![${values.map(escapeSearchFilterValue).join(",")}]`;

export const buildSearchPartialFilter = (field: string, value: string): string => `${field}:${escapeSearchFilterValue(value)}`;

export const buildSearchPrefixFilter = (field: string, value: string): string => `${field}:=${escapeSearchFilterValue(`${value}*`)}`;

export const buildSearchBooleanFilter = (field: string, value: boolean): string => `${field}:=${value}`;

export const buildSearchNumberFilter = (field: string, operator: ">" | "<" | ">=" | "<=", value: number): string => `${field}:${operator}${value}`;

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
