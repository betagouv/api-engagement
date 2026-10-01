import type { NewsletterSubscribeRequest, NewsletterSubscribeResponse } from "@engagement/dto";
import type { ActionFunctionArgs } from "react-router";

import { createApi } from "~/services/api";

export async function action({ request }: ActionFunctionArgs) {
  const api = createApi(request);
  try {
    const body = (await request.json()) as NewsletterSubscribeRequest;
    const data = await api.post<NewsletterSubscribeResponse>("/newsletter", body);
    return api.json({ ok: true, data });
  } catch (error) {
    return api.error(error);
  }
}
