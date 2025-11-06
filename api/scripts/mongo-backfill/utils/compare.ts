import { stringifyJson } from "./normalize";

export const compareStrings = (a: string | null, b: string | null) => (a ?? null) === (b ?? null);
export const compareNumbers = (a: number | null, b: number | null) => (a ?? null) === (b ?? null);
export const compareDates = (a: Date | null, b: Date | null) => {
  const timeA = a ? a.getTime() : null;
  const timeB = b ? b.getTime() : null;
  return timeA === timeB;
};
export const compareStringArrays = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};
export const compareJsons = (a: unknown, b: unknown) => stringifyJson(a ?? null) === stringifyJson(b ?? null);
export const compareBooleans = (a: boolean, b: boolean) => a === b;
