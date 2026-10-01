import type { MissionDetailResponse } from "@engagement/dto";
import type { LoaderFunctionArgs } from "react-router";

import { createApi } from "~/services/api";
import { sanitizeDescriptionHtml } from "~/services/api/sanitize";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params;
  const api = createApi(request);
  if (!id) return api.json({ ok: false, code: "MISSING_ID" }, { status: 400 });
  const addressId = new URL(request.url).searchParams.get("addressId");
  try {
    const data = await api.get<MissionDetailResponse>(`/missions/browse/${id}${addressId ? `?addressId=${encodeURIComponent(addressId)}` : ""}`);
    if (data.descriptionHtml) data.descriptionHtml = sanitizeDescriptionHtml(data.descriptionHtml);
    return api.json({ ok: true, data });
  } catch (error) {
    return api.error(error);
  }
}
