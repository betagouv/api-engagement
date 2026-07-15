import type { MissionRemote } from "@/types/mission";

export const isAddressNeutralizedRemote = (remote: MissionRemote | null | undefined): remote is "full" | "local" => remote === "full" || remote === "local";
