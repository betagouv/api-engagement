import { slugify } from "./string";

export const normalizeOptionalString = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

interface NormalizeCollectionOptions<T> {
  key: (item: T) => string | number;
}

export const normalizeCollection = <Input, Output>(
  items: ReadonlyArray<Input> | null | undefined,
  mapper: (item: Input, index: number) => Output | null | undefined,
  options: NormalizeCollectionOptions<Output>
): Output[] => {
  if (!items?.length) {
    return [];
  }

  const unique = new Map<string | number, Output>();

  items.forEach((item, index) => {
    const mapped = mapper(item, index);
    if (!mapped) {
      return;
    }
    const key = options.key(mapped);
    if (key === "" || key === null || key === undefined) {
      return;
    }
    unique.set(key, mapped);
  });

  return Array.from(unique.values());
};

export const normalizeStringArray = (values?: readonly (string | null | undefined)[] | null, options?: { slugifyItems?: boolean }) => {
  if (!values || values.length === 0) {
    return [] as string[];
  }
  const result: string[] = [];
  const seen = new Set<string>();
  const shouldSlugify = options?.slugifyItems ?? false;
  for (const value of values) {
    const normalized = normalizeOptionalString(value);
    if (!normalized) {
      continue;
    }
    const slugged = shouldSlugify ? slugify(normalized) : normalized;
    if (!slugged) {
      continue;
    }
    if (seen.has(slugged)) {
      continue;
    }
    seen.add(slugged);
    result.push(slugged);
  }
  return result;
};

export const normalizeStringList = (value: unknown, options?: { slugifyItems?: boolean }) => {
  if (Array.isArray(value)) {
    return normalizeStringArray(value, options);
  }
  if (typeof value === "string" || value === null || value === undefined) {
    return normalizeStringArray(value ? [value] : [], options);
  }
  return [];
};

export const normalizeSlug = (source?: string | null, override?: string | null): string | null => {
  const normalizedOverride = normalizeOptionalString(override ?? undefined);
  if (normalizedOverride) {
    return normalizedOverride;
  }
  const normalizedSource = normalizeOptionalString(source ?? undefined);
  if (!normalizedSource) {
    return null;
  }
  const slug = slugify(normalizedSource);
  return slug || null;
};
