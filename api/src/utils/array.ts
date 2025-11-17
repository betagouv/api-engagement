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
