export const COMPENSATION_UNITS = ["hour", "day", "month", "year"] as const;
export const COMPENSATION_TYPES = ["gross", "net"] as const;

export type CompensationUnit = (typeof COMPENSATION_UNITS)[number];
export type CompensationType = (typeof COMPENSATION_TYPES)[number];
