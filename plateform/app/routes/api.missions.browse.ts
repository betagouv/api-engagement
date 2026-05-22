import type { MissionBrowseResponse } from "@engagement/dto";
import type { LoaderFunctionArgs } from "react-router";

import { api } from "~/services/api";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  try {
    const data = await api.get<MissionBrowseResponse>(`/missions/browse?${url.searchParams}`, request.signal);
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json({ ok: false, code: error instanceof Error ? error.message : "upstream_error" }, { status: 502 });
  }
}
