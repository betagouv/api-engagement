import type { EvalEnv, MatchResponse, MatchingAlgo, MissionDetail, UserScoringAnswer } from "./types";

const API_URLS: Record<EvalEnv, string> = {
  staging: "https://api.api-engagement-dev.fr",
  production: "https://api.api-engagement.beta.gouv.fr",
};

type ApiClientOptions = {
  env: EvalEnv;
  apiKey: string;
  engineVersion?: MatchingAlgo;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const unwrapData = <T>(payload: unknown): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export class ApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly engineVersion?: MatchingAlgo;
  private lastRequestAt = 0;

  constructor(options: ApiClientOptions) {
    this.baseUrl = API_URLS[options.env];
    this.apiKey = options.apiKey;
    this.engineVersion = options.engineVersion;
  }

  async createUserScoring(answers: UserScoringAnswer[], distinctId: string): Promise<string> {
    const response = await this.request<{ id: string }>("/user-scoring", {
      method: "POST",
      body: JSON.stringify({ answers, distinctId, missionAlertEnabled: false }),
    });
    return response.id;
  }

  async getMatch(userScoringId: string): Promise<MatchResponse> {
    const params = new URLSearchParams({ userScoringId, limit: "5", offset: "0" });
    if (this.engineVersion) params.set("engineVersion", this.engineVersion);
    const match = await this.request<MatchResponse>(`/missions/match?${params.toString()}`);
    if (this.engineVersion && match.engineVersion !== this.engineVersion) {
      throw new Error(`Version moteur inattendue: demande=${this.engineVersion}, reponse=${match.engineVersion ?? "absente"}. API cible pas a jour.`);
    }
    return match;
  }

  async getMissionDetail(missionId: string): Promise<MissionDetail | null> {
    try {
      return await this.request<MissionDetail>(`/missions/browse/${encodeURIComponent(missionId)}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("HTTP 404")) {
        return null;
      }
      throw error;
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    await this.throttle();
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "content-type": "application/json",
      "x-api-key": this.apiKey,
      ...(init.headers ?? {}),
    };

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url, { ...init, headers });
        const text = await response.text();
        const payload = text ? JSON.parse(text) : null;
        if (response.ok) {
          return unwrapData<T>(payload);
        }
        if (![429, 500, 502, 503, 504].includes(response.status)) {
          throw new Error(`HTTP ${response.status} ${url}: ${text}`);
        }
        lastError = new Error(`HTTP ${response.status} ${url}: ${text}`);
      } catch (error) {
        lastError = error;
      }
      await sleep(500 * 2 ** attempt);
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async throttle(): Promise<void> {
    const minDelayMs = 700;
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < minDelayMs) {
      await sleep(minDelayMs - elapsed);
    }
    this.lastRequestAt = Date.now();
  }
}

export const getApiKey = (env: EvalEnv): string => {
  const key = env === "staging" ? process.env.EVAL_matching_API_KEY_STAGING : process.env.EVAL_matching_API_KEY_PRODUCTION;
  if (!key) {
    throw new Error(`Cle API manquante: ${env === "staging" ? "EVAL_matching_API_KEY_STAGING" : "EVAL_matching_API_KEY_PRODUCTION"}`);
  }
  return key;
};
