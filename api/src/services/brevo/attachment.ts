import { captureException } from "@/error";

import { requestBrevoApi } from "./client";

export const downloadAttachment = async (token: string) => {
  try {
    const res = await requestBrevoApi<Response>(`/inbound/attachments/${token}`, {}, "GET");
    if (!res.ok) {
      throw res.data;
    }

    const buffer = await res.data.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    captureException(error);
  }
};
