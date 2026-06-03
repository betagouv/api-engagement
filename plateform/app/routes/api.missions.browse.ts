import type { MissionBrowseResponse } from "@engagement/dto";
import type { LoaderFunctionArgs } from "react-router";

import { createApi, upstreamErrorResponse } from "~/services/api";

export async function loader({ request }: LoaderFunctionArgs) {
  const api = createApi(request);
  const url = new URL(request.url);
  try {
    const data = await api.get<MissionBrowseResponse>(`/missions/browse?${url.searchParams}`);
    return Response.json({ ok: true, data });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
