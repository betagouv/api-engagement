import { SENDINBLUE_APIKEY } from "@/config";

import type { BrevoApiResponse, BrevoHttpMethod, BrevoRequestBody } from "./types";

const BREVO_API_URL = "https://api.brevo.com/v3";

export const hasBrevoApiKey = () => Boolean(SENDINBLUE_APIKEY);

export const requestBrevoApi = async <T = any>(path: string, body: BrevoRequestBody = {}, method: BrevoHttpMethod = "POST"): Promise<BrevoApiResponse<T>> => {
  if (!SENDINBLUE_APIKEY) {
    return { ok: false, data: "SENDINBLUE_APIKEY is undefined" as T };
  }

  const options: RequestInit = {
    method,
    headers: {
      "api-key": SENDINBLUE_APIKEY,
      "Content-Type": "application/json",
    },
  };

  if (Object.keys(body).length > 0) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BREVO_API_URL}${path}`, options);
  if (res.headers.get("content-type")?.includes("application/json")) {
    return { ok: res.ok, data: (await res.json()) as T };
  }

  return { ok: res.ok, data: res as T };
};

export const api = requestBrevoApi;
