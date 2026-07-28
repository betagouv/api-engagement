import type { MissionDetailResponse } from "@engagement/dto";
import type { LoaderFunctionArgs } from "react-router";

import { createApi, upstreamErrorResponse } from "~/services/api";
import { sanitizeDescriptionHtml } from "~/services/api/sanitize";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) return Response.json({ ok: false, code: "MISSING_ID" }, { status: 400 });
  const addressId = new URL(request.url).searchParams.get("addressId");
  const api = createApi(request);
  try {
    const data = await api.get<MissionDetailResponse>(`/missions/browse/${id}${addressId ? `?addressId=${encodeURIComponent(addressId)}` : ""}`);
    if (data.descriptionHtml) data.descriptionHtml = sanitizeDescriptionHtml(data.descriptionHtml);
    return Response.json({ ok: true, data });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
