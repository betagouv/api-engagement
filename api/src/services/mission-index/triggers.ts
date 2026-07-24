const MISSION_INDEX_TRIGGER_FIELDS = new Set([
  "publisherId",
  "publisherOrganizationId",
  "title",
  "domain",
  "addresses",
  "remote",
  "schedule",
  "duration",
  "startAt",
  "openToMinors",
  "reducedMobilityAccessible",
  "closeToTransport",
  "tasks",
  "audience",
  "tags",
  "activities",
  "deletedAt",
  "statusCode",
]);

export const changesRequireIndex = (changes: Record<string, unknown>): boolean =>
  Object.keys(changes).some((field) => MISSION_INDEX_TRIGGER_FIELDS.has(field));
