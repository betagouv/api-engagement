import type { ActionFunctionArgs } from "react-router";
import { api } from "~/services/api.server";
import type { SendMissionEmailPayload, SendMissionEmailResponse } from "~/services/email";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = (await request.json()) as SendMissionEmailPayload;
    const data = await api.post<SendMissionEmailResponse>("/email/mission", body, request.signal);
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json({ ok: false, code: error instanceof Error ? error.message : "upstream_error" }, { status: 502 });
  }
}
