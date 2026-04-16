const rawApiUrl: string | undefined = typeof window !== "undefined" ? (window as any).__API_URL__ : undefined;
const BASE = rawApiUrl && rawApiUrl !== "API_URL_PLACEHOLDER" ? rawApiUrl : (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export type TaxonomyValue = {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  order: number | null;
};

export type Taxonomy = {
  id: string;
  key: string;
  label: string;
  type: "categorical" | "multi_value" | "ordered" | "gate";
  values: TaxonomyValue[];
};

export type MatchValueDetail = {
  dimensionKey: string;
  taxonomyValueKey: string;
  taxonomyValueLabel: string;
  enrichmentConfidence: number;
  scoringScore: number;
  evidence: unknown;
};

export type MissionDetail = {
  description: string | null;
  tasks: string[];
  audience: string[];
  softSkills: string[];
  requirements: string[];
  tags: string[];
  type: string | null;
  remote: string | null;
  openToMinors: boolean | null;
  reducedMobilityAccessible: boolean | null;
  duration: number | null;
  schedule: string | null;
  startAt: string | null;
  endAt: string | null;
  domainOriginal: string | null;
};

export type MatchResultItem = {
  missionId: string;
  missionScoringId: string;
  title: string;
  publisherName: string | null;
  city: string | null;
  mission: MissionDetail | null;
  totalScore: number;
  taxonomyScore: number;
  geoScore: number | null;
  distanceKm: number | null;
  dimensionScores: Partial<Record<string, number>>;
  values: MatchValueDetail[];
};

export type MatchResult = {
  tookMs: number;
  selectedDimensions: string[];
  items: MatchResultItem[];
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const json = await res.json();
  if (!json.ok) throw new Error(json.message ?? json.error ?? "API error");
  return json.data as T;
}

export async function fetchTaxonomies(): Promise<Taxonomy[]> {
  return apiFetch<Taxonomy[]>("/poc/taxonomy");
}

export async function postUserScoring(
  answers: { taxonomy_value_key: string }[],
  geo: { lat: number; lon: number } | null
): Promise<{ id: string; created_at: string }> {
  return apiFetch("/user-scoring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, ...(geo ? { geo } : {}) }),
  });
}

export async function fetchMatch(userScoringId: string, limit = 20): Promise<MatchResult> {
  return apiFetch<MatchResult>(`/poc/match?userScoringId=${encodeURIComponent(userScoringId)}&limit=${limit}`);
}
