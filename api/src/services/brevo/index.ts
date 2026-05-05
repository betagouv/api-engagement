import { downloadAttachment } from "./attachment";
import { api } from "./client";
import { createOrUpdateContact } from "./contact";
import { sendTemplate } from "./email";

export { downloadAttachment } from "./attachment";
export { api, requestBrevoApi } from "./client";
export { createOrUpdateContact } from "./contact";
export { sendTemplate, TEMPLATE_IDS } from "./email";
export type { BrevoApiResponse, BrevoHttpMethod, BrevoRequestBody, CreateOrUpdateContactParams, EmailBody, EmailOptions } from "./types";

export default { api, createOrUpdateContact, sendTemplate, downloadAttachment };
