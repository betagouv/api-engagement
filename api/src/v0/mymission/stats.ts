import { statEventService } from "../../services/stat-event";
import { StatEventMissionStatsDetails, StatEventMissionStatsSummary } from "../../types/stat-event";

export async function getMissionStatsWithDetails(missionId: string): Promise<{
  clicks: StatEventMissionStatsDetails[];
  applications: StatEventMissionStatsDetails[];
}> {
  return statEventService.findStatEventMissionStatsWithDetails(missionId);
}

export async function getMissionStatsSummary(missionId: string): Promise<{
  clicks: StatEventMissionStatsSummary[];
  applications: StatEventMissionStatsSummary[];
}> {
  return statEventService.findStatEventMissionStatsSummary(missionId);
}
