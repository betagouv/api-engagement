import type { UserScoringCreateRequest, UserScoringCreateResponse, UserScoringUpdateRequest } from "@engagement/dto";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; data?: T; code?: string };
  if (!res.ok || !json.ok) throw new Error(json.code ?? `fetch error on ${method} ${path}`);
  return json.data as T;
}

export async function createUserScoring(payload: UserScoringCreateRequest): Promise<string> {
  const data = await request<UserScoringCreateResponse>("POST", "/api/user-scoring", payload);
  return data.id;
}

export async function updateUserScoring(userScoringId: string, payload: UserScoringUpdateRequest): Promise<void> {
  await request("PUT", `/api/user-scoring/${userScoringId}`, payload);
}
