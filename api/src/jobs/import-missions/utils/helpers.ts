import { isValidSiren, isValidSiret } from "../../../utils";

export const hasEncodageIssue = (str = "") => {
  return str.indexOf("&#") !== -1;
};

export const parseString = (value: string | undefined) => {
  if (!value) {
    return "";
  }
  return String(value);
};

export const parseStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    const normalized = value.map((v) => String(v ?? "").trim()).filter((v) => v.length > 0);
    return normalized.length ? normalized : undefined;
  }

  if (typeof value === "object") {
    const obj = value as any;
    if ("value" in obj) {
      return parseStringArray(obj.value);
    }
    if ("item" in obj) {
      return parseStringArray(obj.item);
    }
    return undefined;
  }

  const str = String(value).trim();
  if (!str) {
    return undefined;
  }
  const split = str
    .split(",")
    .map((i) => i.trim())
    .filter((i) => i.length > 0);
  return split.length ? split : undefined;
};

export const parseSiren = (value: string | undefined) => {
  const parsed = parseString(value);
  if (!parsed) {
    return { siret: null, siren: null };
  }
  if (isValidSiret(parsed)) {
    return { siret: parsed, siren: parsed.slice(0, 9) };
  }
  if (isValidSiren(parsed)) {
    return { siren: parsed, siret: null };
  }
  return { siret: null, siren: null };
};

export const parseBool = (value: string | boolean | undefined | null) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  return ["yes", "true", "1"].includes(normalized);
};

export const parseDate = (value: string | Date | undefined) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const hasTimezoneDesignator = /[zZ]$/.test(trimmed) || /[+\-]\d{2}:?\d{2}$/.test(trimmed);

    if (!hasTimezoneDesignator) {
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours(), parsed.getMinutes(), parsed.getSeconds(), parsed.getMilliseconds()));
    }
  }

  return parsed;
};

export const parseNumber = (value: number | string | undefined) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (isNaN(Number(value))) {
    return null;
  }
  return Number(value);
};

export const parseLowercase = (value: string | undefined) => {
  const parsed = parseString(value);
  return parsed ? parsed.toLowerCase() : null;
};
