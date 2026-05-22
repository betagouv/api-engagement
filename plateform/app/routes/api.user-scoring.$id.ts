import type { ActionFunctionArgs } from "react-router";

import { api, upstreamErrorResponse } from "~/services/api";

export async function action({ params, request }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) return Response.json({ ok: false, code: "MISSING_ID" }, { status: 400 });
  try {
    const body = await request.json();
    await api.put(`/user-scoring/${id}`, body, request.signal);
    return Response.json({ ok: true, data: null });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
