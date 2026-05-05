import { captureException } from "@/error";

import { hasBrevoApiKey, requestBrevoApi } from "./client";
import type { EmailBody, EmailOptions } from "./types";
import { buildEmailRecipients, redactEmailRecipients, sanitizeEmailOptions } from "./utils";

export const TEMPLATE_IDS = {
  INVITATION: 1,
  FORGOT_PASSWORD: 5,
  MISSION_MATCHING_RESULTS: 27,
};

const buildEmailBody = (templateId: number, options: EmailOptions): EmailBody => {
  const body: EmailBody = {
    templateId,
    to: buildEmailRecipients(options.emailTo),
  };

  if (options.emailBcc) {
    body.bcc = buildEmailRecipients(options.emailBcc);
  }
  if (options.subject) {
    body.subject = options.subject;
  }
  if (options.params) {
    body.params = options.params;
  }
  if (options.attachment) {
    body.attachment = options.attachment;
  }
  if (options.tags) {
    body.tags = options.tags;
  }

  return body;
};

const logEmailInDev = (body: EmailBody) => {
  console.log(`---- EMAIL ----`);
  console.log(`[to]: ${JSON.stringify(redactEmailRecipients(body.to), null, 2)}`);
  console.log(`[template]: ${body.templateId}`);
  console.log(`[subject]: ${body.subject}`);
  console.log(`[params]: ${JSON.stringify(body.params, null, 2)}`);
  console.log(`---- EMAIL ----`);
};

const captureEmailError = (error: unknown, templateId: number, options: EmailOptions) => {
  captureException(error, { extra: { templateId, options: sanitizeEmailOptions(options) } });
};

export const sendTemplate = async (templateId: number, options: EmailOptions): Promise<{ ok: boolean; data?: any }> => {
  try {
    const body = buildEmailBody(templateId, options);

    if (!hasBrevoApiKey()) {
      logEmailInDev(body);
      return { ok: true, data: { dev: true } };
    }

    const res = await requestBrevoApi("/smtp/email", body);
    if (!res.ok) {
      captureEmailError(res.data, templateId, options);
      return { ok: false, data: res.data };
    }
    return { ok: true, data: res.data };
  } catch (error) {
    captureEmailError(error, templateId, options);
    return { ok: false };
  }
};
