export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  if (size <= 0) {
    return [items.slice()] as T[][];
  }
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

export const normalizeToArray = (value?: string | string[]): string[] | undefined => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value.length) {
    return [value];
  }
};
