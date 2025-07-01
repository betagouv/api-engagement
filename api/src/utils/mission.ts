import { API_URL } from "../config";
import { Mission } from "../types";

/**
 * Format the tracked application URL for a mission and a given publisher
 *
 * @param mission The mission to format the URL for
 * @param publisherId The publisher ID to format the URL for
 * @returns The tracked application URL
 */
export const getMissionTrackedApplicationUrl = (mission: Mission, publisherId: string) => {
  return `${API_URL}/r/${mission._id}/${publisherId}`;
};
