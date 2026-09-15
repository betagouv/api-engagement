import type { EmailOptions, EmailRecipient } from "./types";

export const redactEmail = () => "[redacted-email]";

export const buildEmailRecipients = (emails: string[]): EmailRecipient[] => {
  return emails.map((email) => ({ email }));
};

export const redactEmailRecipients = (recipients: EmailRecipient[]): EmailRecipient[] => {
  return recipients.map(() => ({ email: redactEmail() }));
};

export const redactEmailParams = (params?: Record<string, unknown>): Record<string, string> | undefined => {
  if (!params) {
    return undefined;
  }
  return Object.fromEntries(Object.keys(params).map((key) => [key, "[redacted]"]));
};

export const sanitizeEmailOptions = (options: EmailOptions) => ({
  ...options,
  emailTo: options.emailTo.map(redactEmail),
  emailBcc: options.emailBcc?.map(redactEmail),
  params: redactEmailParams(options.params),
});
