import type { NewsletterSubscribeRequest, NewsletterSubscribeResponse } from "@engagement/dto";

import { client } from "~/services/client";

export async function subscribeNewsletter(payload: NewsletterSubscribeRequest): Promise<NewsletterSubscribeResponse> {
  return client.post<NewsletterSubscribeResponse>("/api/newsletter", payload);
}
