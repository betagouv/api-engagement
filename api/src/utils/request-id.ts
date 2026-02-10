import { randomUUID } from "crypto";

export const REQUEST_ID_HEADER = "x-request-id";

export const getOrCreateRequestId = (incoming?: string) => {
  const value = incoming?.trim();
  return value ? value : randomUUID();
};
