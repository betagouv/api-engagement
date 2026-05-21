import type { MissionDetailResponse } from "@engagement/dto";
import type { LoaderFunctionArgs } from "react-router";

import { api } from "~/services/api.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) return Response.json({ ok: false, code: "MISSING_ID" }, { status: 400 });
  try {
    const data = await api.get<MissionDetailResponse>(`/missions/browse/${id}`, request.signal);
    return Response.json({ ok: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "upstream_error";
    return Response.json({ ok: false, code: msg }, { status: msg.includes("404") ? 404 : 502 });
  }
}
