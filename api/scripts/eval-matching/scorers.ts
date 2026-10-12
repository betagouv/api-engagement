import { resolveTrancheAgeValues } from "@engagement/taxonomy";
import type { DeterministicScores, GateViolation, MatchItem, Parcours } from "./types";
import { getAnswerValues } from "./validate";

const valueKey = (value: { taxonomyKey: string; taxonomyValueKey: string }): string => `${value.taxonomyKey}.${value.taxonomyValueKey}`;

const effectiveDistance = (item: MatchItem): number => {
  if (item.mission.remote === "full" || item.mission.remote === "possible") return 0;
  return item.mission.location.distanceKm ?? Number.POSITIVE_INFINITY;
};

export const scoreGeo = (items: MatchItem[]): number | null => {
  if (items.every((item) => item.mission.location.distanceKm == null && (item.mission.remote === "full" || item.mission.remote === "possible"))) {
    return 5;
  }
  const distances = items.map(effectiveDistance);
  if (distances.length === 0) return null;
  if (distances.every((distance) => distance < 20)) return 5;
  if (distances.every((distance) => distance < 30)) return 4;
  const over30 = distances.filter((distance) => distance > 30).length;
  if (over30 === distances.length) return 1;
  if (over30 <= 2) return 3;
  if (over30 < distances.length) return 2;
  return 1;
};

export const scoreFormat = (items: MatchItem[], dureesUser: string[]): { score: number; missionsSansTagFormat: string[] } => {
  if (dureesUser.includes("je_ne_sais_pas")) {
    return { score: 5, missionsSansTagFormat: [] };
  }

  let compatible = 0;
  const missionsSansTagFormat: string[] = [];
  for (const item of items) {
    const typeMissionValues = item.match.values.filter((value) => value.taxonomyKey === "type_mission");
    if (typeMissionValues.length === 0) {
      missionsSansTagFormat.push(item.mission.id);
      continue;
    }
    if (typeMissionValues.some((value) => dureesUser.includes(value.taxonomyValueKey))) {
      compatible += 1;
    }
  }

  if (compatible >= 5) return { score: 5, missionsSansTagFormat };
  if (compatible === 4) return { score: 4, missionsSansTagFormat };
  if (compatible === 3) return { score: 3, missionsSansTagFormat };
  if (compatible === 2) return { score: 2, missionsSansTagFormat };
  return { score: 1, missionsSansTagFormat };
};

export const checkGates = (items: MatchItem[], parcours: Parcours): GateViolation[] => {
  const userAgeTags = resolveTrancheAgeValues({ age: parcours.age, handicap: parcours.handicap === "oui" });
  const userAgeTagSet = new Set(userAgeTags);

  return items.flatMap((item) => {
    const missionAgeTags = item.match.values.filter((value) => value.taxonomyKey === "tranche_age").map(valueKey);
    const missionAgeValueKeys = item.match.values.filter((value) => value.taxonomyKey === "tranche_age").map((value) => value.taxonomyValueKey);
    if (missionAgeTags.length === 0) return [];
    if (missionAgeValueKeys.some((tag) => userAgeTagSet.has(tag as never))) return [];
    return [{ missionId: item.mission.id, title: item.mission.title, missionAgeTags, userAgeTags: userAgeTags.map((tag) => `tranche_age.${tag}`) }];
  });
};

export const computeDeterministicScores = (items: MatchItem[], parcours: Parcours): DeterministicScores => {
  const format = scoreFormat(items, getAnswerValues(parcours.answers, "type_mission"));
  return {
    geo: scoreGeo(items),
    format: format.score,
    missionsSansTagFormat: format.missionsSansTagFormat,
    gateViolations: checkGates(items, parcours),
  };
};
