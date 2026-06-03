import type { SendMissionEmailRequest, SendMissionEmailResponse } from "@engagement/dto";
import type { ActionFunctionArgs } from "react-router";

import { createApi, upstreamErrorResponse } from "~/services/api";

export async function action({ request }: ActionFunctionArgs) {
  const api = createApi(request);
  try {
    const body = (await request.json()) as SendMissionEmailRequest;
    const data = await api.post<SendMissionEmailResponse>("/email/mission", body);
    return Response.json({ ok: true, data });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
