import type { EmailOptions, EmailRecipient } from "./types";

export const redactEmail = () => "[redacted-email]";

export const buildEmailRecipients = (emails: string[]): EmailRecipient[] => {
  return emails.map((email) => ({ email }));
};

export const redactEmailRecipients = (recipients: EmailRecipient[]): EmailRecipient[] => {
  return recipients.map(() => ({ email: redactEmail() }));
};

export const sanitizeEmailOptions = (options: EmailOptions) => ({
  ...options,
  emailTo: options.emailTo.map(redactEmail),
  emailBcc: options.emailBcc?.map(redactEmail),
});
