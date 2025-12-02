import type { Prisma } from "../../../src/db/core";

export const normalizeDate = (value: Date | string | null | undefined): Date | null => {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeNumber = (value: number | string | null | undefined): number | null => {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toJsonValue = (value: unknown): Prisma.InputJsonValue | null => {
  if (value == null) {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn("[MongoBackfill] Unable to serialize JSON value, defaulting to null:", error);
    return null;
  }
};

export const stringifyJson = (value: unknown): string => {
  const sorter = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map((item) => sorter(item));
    }
    if (input && typeof input === "object") {
      const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
      const result: Record<string, unknown> = {};
      for (const [key, val] of entries) {
        result[key] = sorter(val);
      }
      return result;
    }
    return input;
  };

  return JSON.stringify(sorter(value));
};
