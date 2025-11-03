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
