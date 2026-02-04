import slugify from "slugify";

import { ACTIVITIES } from "../constants/activity";

// & supprimé (pas "and"), apostrophe → tiret — cohérent avec les slugs de ACTIVITIES.
slugify.extend({ "&": "", "'": "-" });
const toSlug = (input: string) => slugify(input, { lower: true, strict: true });

// Both slugs and labels are matchable; output always normalises to the label.
const LABEL_BY_NAME = new Map<string, string>(
  Object.entries(ACTIVITIES).flatMap(([slug, label]) => [
    [slug, label],
    [label, label],
  ])
);
const ALL_NAMES = [...LABEL_BY_NAME.keys()];
const ACTIVITIES_SET = new Set(ALL_NAMES);
const ACTIVITIES_BY_LENGTH = ALL_NAMES.sort((a, b) => b.length - a.length);

/**
 * Splits a comma-separated activity string into individual activities,
 * normalising every recognised slug or label to its canonical label.
 * Longest-match first ensures compound activities (e.g. "Soutien, Accompagnement")
 * are preserved as atomic units without special-case logic.
 * Unknown tokens are passed through unchanged.
 *
 * Example: "transmission-pedagogie, Animation" → ["Transmission, Pédagogie", "Animation"]
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
      result.push(LABEL_BY_NAME.get(match)!);
      remaining = remaining.slice(match.length);
    } else {
      // No known activity at this position — consume up to the next comma,
      // then try to match via slugification before falling back to raw token.
      const commaIdx = remaining.indexOf(",");
      if (commaIdx === -1) {
        const trimmed = remaining.trim();
        if (trimmed) {
          result.push(LABEL_BY_NAME.get(toSlug(trimmed)) ?? trimmed);
        }
        break;
      } else {
        const trimmed = remaining.slice(0, commaIdx).trim();
        if (trimmed) {
          result.push(LABEL_BY_NAME.get(toSlug(trimmed)) ?? trimmed);
        }
        remaining = remaining.slice(commaIdx + 1);
      }
    }
  }

  return result;
};

/**
 * Returns true if the given activity name (slug or label) is in the whitelist.
 */
export const isWhitelistedActivity = (name: string): boolean => {
  return ACTIVITIES_SET.has(name.trim());
};
