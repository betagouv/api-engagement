import type { UserScoringCreateRequest, UserScoringCreateResponse } from "@engagement/dto";
import type { ActionFunctionArgs } from "react-router";

import { api } from "~/services/api";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = (await request.json()) as UserScoringCreateRequest;
    const data = await api.post<UserScoringCreateResponse>("/user-scoring", body, request.signal);
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json({ ok: false, code: error instanceof Error ? error.message : "upstream_error" }, { status: 502 });
  }
}
