import type { NewsletterSubscribeRequest, NewsletterSubscribeResponse } from "@engagement/dto";
import type { ActionFunctionArgs } from "react-router";

import { createApi, upstreamErrorResponse } from "~/services/api";

export async function action({ request }: ActionFunctionArgs) {
  const api = createApi(request);
  try {
    const body = (await request.json()) as NewsletterSubscribeRequest;
    const data = await api.post<NewsletterSubscribeResponse>("/newsletter", body);
    return Response.json({ ok: true, data });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
