import { captureException } from "@/error";

import { hasBrevoApiKey, requestBrevoApi } from "./client";
import type { ContactBody, CreateOrUpdateContactParams } from "./types";
import { redactEmail } from "./utils";

// Code renvoyé par Brevo quand on crée un contact dont l'email existe déjà.
const BREVO_DUPLICATE_CONTACT_CODE = "duplicate_parameter";

const buildContactBody = (params: CreateOrUpdateContactParams): ContactBody => ({
  email: params.email,
  updateEnabled: true,
  listIds: params.listIds,
  attributes: {
    DISTINCT_ID: params.distinctId,
    MISSION_ALERT_ENABLED: params.missionAlertEnabled,
    USER_SCORING_ID: params.userScoringId,
  },
});

// SIGNUP_SOURCE et QUIZ_SESSION_ID décrivent la première inscription : ils ne sont posés qu'à la création du contact.
const buildCreateContactBody = (params: CreateOrUpdateContactParams): ContactBody => {
  const body = buildContactBody(params);
  return {
    ...body,
    updateEnabled: false,
    attributes: { ...body.attributes, SIGNUP_SOURCE: params.signupSource, QUIZ_SESSION_ID: params.userScoringId },
  };
};

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

// Crée le contact avec ses attributs d'origine. S'il existe déjà, on met seulement à jour ses listes et
// ses attributs courants : un upsert Brevo écraserait SIGNUP_SOURCE avec la source de la dernière inscription.
export const createOrUpdateContact = async (params: CreateOrUpdateContactParams): Promise<{ ok: boolean; data?: any }> => {
  const createBody = buildCreateContactBody(params);

  try {
    if (!hasBrevoApiKey()) {
      logContactInDev(params, createBody);
      return { ok: true, data: { dev: true } };
    }

    const createRes = await requestBrevoApi("/contacts", createBody);
    if (createRes.ok) {
      return { ok: true, data: createRes.data };
    }
    if (createRes.data?.code !== BREVO_DUPLICATE_CONTACT_CODE) {
      captureContactError(createRes.data, createBody);
      return { ok: false, data: createRes.data };
    }

    const { listIds, attributes } = buildContactBody(params);
    const updateRes = await requestBrevoApi(`/contacts/${encodeURIComponent(params.email)}`, { listIds, attributes }, "PUT");
    if (!updateRes.ok) {
      captureContactError(updateRes.data, createBody);
      return { ok: false, data: updateRes.data };
    }
    return { ok: true, data: updateRes.data };
  } catch (error) {
    captureContactError(error, createBody);
    return { ok: false };
  }
};
