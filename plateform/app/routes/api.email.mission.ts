import type { SendMissionEmailRequest, SendMissionEmailResponse } from "@engagement/dto";
import type { ActionFunctionArgs } from "react-router";

import { api, upstreamErrorResponse } from "~/services/api";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = (await request.json()) as SendMissionEmailRequest;
    const data = await api.post<SendMissionEmailResponse>("/email/mission", body, request.signal);
    return Response.json({ ok: true, data });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
