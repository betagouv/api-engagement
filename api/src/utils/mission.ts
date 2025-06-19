import { API_URL } from "../config";
import { Mission } from "../types";

export const getMissionTrackedApplicationUrl = (mission: Mission) => {
  return `${API_URL}/r/${mission._id}/${mission.publisherId}`;
};
