export type GeolocStatus = "ENRICHED_BY_PUBLISHER" | "ENRICHED_BY_API" | "NOT_FOUND" | "NO_DATA" | "SHOULD_ENRICH" | "FAILED";

export enum MissionType {
  BENEVOLAT = "benevolat",
  VOLONTARIAT = "volontariat_service_civique",
}

export * from "@/types/campaign";
export * from "@/types/email";
export * from "@/types/import";
export * from "@/types/mission";
export * from "@/types/mission-job-board";
export * from "@/types/moderation-event";
export * from "@/types/organization";
export * from "@/types/publisher";
export * from "@/types/report";
export * from "@/types/stat-event";
export * from "@/types/user";
export * from "@/types/widget";
