export const startOfDayUtc = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export const endOfDayUtc = (value: string): Date => new Date(`${value}T23:59:59.999Z`);

export const normalizeDateRange = <T extends { from?: string; to?: string }>(data: T) => ({
  ...data,
  from: data.from ? startOfDayUtc(data.from) : undefined,
  to: data.to ? endOfDayUtc(data.to) : undefined,
});
