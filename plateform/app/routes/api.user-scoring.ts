import type { UserScoringCreateRequest, UserScoringCreateResponse } from "@engagement/dto";
import type { ActionFunctionArgs } from "react-router";

import { createApi, upstreamErrorResponse } from "~/services/api";

export async function action({ request }: ActionFunctionArgs) {
  const api = createApi(request);
  try {
    const body = (await request.json()) as UserScoringCreateRequest;
    const data = await api.post<UserScoringCreateResponse>("/user-scoring", body);
    return Response.json({ ok: true, data });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
