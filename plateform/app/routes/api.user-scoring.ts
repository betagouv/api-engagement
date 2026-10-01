import type { UserScoringCreateRequest, UserScoringCreateResponse } from "@engagement/dto";
import type { ActionFunctionArgs } from "react-router";

import { createApi } from "~/services/api";

export async function action({ request }: ActionFunctionArgs) {
  const api = createApi(request);
  try {
    const body = (await request.json()) as UserScoringCreateRequest;
    const data = await api.post<UserScoringCreateResponse>("/user-scoring", body);
    return api.json({ ok: true, data });
  } catch (error) {
    return api.error(error);
  }
}
