import { ACTIVITIES } from "../constants/activity";

// Matchable names: all values (slugs for simple activities, display names for compounds)
const ALL_NAMES = Object.values(ACTIVITIES);
const ACTIVITIES_SET = new Set(ALL_NAMES);
const ACTIVITIES_BY_LENGTH = [...ALL_NAMES].sort((a, b) => b.length - a.length);

/**
 * Splits a comma-separated activity string into individual activities.
 * Longest-match first ensures compound activities (e.g. "Soutien, Accompagnement")
 * are preserved as atomic units without special-case logic.
 *
 * Example: "Transmission, Pédagogie, Animation" → ["Transmission, Pédagogie", "Animation"]
 */
export const splitActivityString = (activityString: string): string[] => {
  if (!activityString?.trim()) {
    return [];
  }

  const result: string[] = [];
  let remaining = activityString.trim();

  while (remaining.length > 0) {
    remaining = remaining.replace(/^[,\s]*/, "");
    if (!remaining) {
      break;
    }

    const match = ACTIVITIES_BY_LENGTH.find((activity) => remaining.startsWith(activity));
    if (match) {
      result.push(match);
      remaining = remaining.slice(match.length);
    } else {
      // No known activity at this position — consume up to the next comma as an unknown token
      const commaIdx = remaining.indexOf(",");
      if (commaIdx === -1) {
        const trimmed = remaining.trim();
        if (trimmed) {
          result.push(trimmed);
        }
        break;
      } else {
        const trimmed = remaining.slice(0, commaIdx).trim();
        if (trimmed) {
          result.push(trimmed);
        }
        remaining = remaining.slice(commaIdx + 1);
      }
    }
  }

  return result;
};

/**
 * Returns true if the given activity name is in the whitelist.
 */
export const isWhitelistedActivity = (name: string): boolean => {
  return ACTIVITIES_SET.has(name.trim());
};
