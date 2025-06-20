import { API_URL } from "../config";
import { Mission } from "../types";

/**
 * Format the tracked application URL for a mission
 *
 * @param mission The mission to format the URL for
 * @returns The tracked application URL
 */
export const getMissionTrackedApplicationUrl = (mission: Mission) => {
  return `${API_URL}/r/${mission._id}/${mission.publisherId}`;
};
