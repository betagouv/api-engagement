export type GeolocStatus = "ENRICHED_BY_PUBLISHER" | "ENRICHED_BY_API" | "NOT_FOUND" | "NO_DATA" | "SHOULD_ENRICH" | "FAILED";

export enum MissionType {
  BENEVOLAT = "benevolat",
  VOLONTARIAT = "volontariat_service_civique",
}

export * from "./campaign";
export * from "./email";
export * from "./import";
export * from "./mission";
export * from "./mission-job-board";
export * from "./moderation-event";
export * from "./organization";
export * from "./publisher";
export * from "./report";
export * from "./stat-event";
export * from "./user";
export * from "./widget";
