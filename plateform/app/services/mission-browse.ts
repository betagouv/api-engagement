import api from "~/services/api";
import type { MissionDetailResponse } from "~/types/mission-detail";

export const fetchMissionDetail = (id: string): Promise<MissionDetailResponse> => api.get<MissionDetailResponse>(`/browse/${id}`);
