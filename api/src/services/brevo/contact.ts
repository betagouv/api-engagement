import { captureException } from "@/error";

import { hasBrevoApiKey, requestBrevoApi } from "./client";
import type { ContactBody, CreateOrUpdateContactParams } from "./types";
import { redactEmail } from "./utils";

const buildContactBody = (params: CreateOrUpdateContactParams): ContactBody => ({
  email: params.email,
  updateEnabled: true,
  listIds: [params.listId],
  attributes: {
    DISTINCT_ID: params.distinctId,
    MISSION_ALERT_ENABLED: params.missionAlertEnabled,
    USER_SCORING_ID: params.userScoringId,
  },
});

const logContactInDev = (params: CreateOrUpdateContactParams, body: ContactBody) => {
  console.log(`---- BREVO CONTACT ----`);
  console.log(`[email]: ${redactEmail()}`);
  console.log(`[distinctId]: ${params.distinctId}`);
  console.log(`[listIds]: ${JSON.stringify(body.listIds)}`);
  console.log(`[attributes]: ${JSON.stringify(body.attributes, null, 2)}`);
  console.log(`---- BREVO CONTACT ----`);
};

const captureContactError = (error: unknown, body: ContactBody) => {
  captureException(error, {
    extra: {
      ...body,
      email: redactEmail(),
    },
  });
};

export const createOrUpdateContact = async (params: CreateOrUpdateContactParams): Promise<{ ok: boolean; data?: any }> => {
  const body = buildContactBody(params);

  try {
    if (!hasBrevoApiKey()) {
      logContactInDev(params, body);
      return { ok: true, data: { dev: true } };
    }

    const res = await requestBrevoApi("/contacts", body);
    if (!res.ok) {
      captureContactError(res.data, body);
      return { ok: false, data: res.data };
    }
    return { ok: true, data: res.data };
  } catch (error) {
    captureContactError(error, body);
    return { ok: false };
  }
};
