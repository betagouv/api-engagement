import zod from "zod";

import type { AuditEvent } from "@/utils/audit-log";

// Payload Brevo "inbound parsing" : https://developers.brevo.com/docs/inbound-parse-webhooks
const mailbox = zod.object({ Address: zod.string() });
export const inboundEmailSchema = zod.object({
  items: zod.array(
    zod.object({
      MessageId: zod.string().optional(),
      From: mailbox,
      Recipients: zod.array(zod.string()).optional(),
      To: zod.array(mailbox).optional(),
      ExtractedMarkdownMessage: zod.string().nullish(),
      RawTextBody: zod.string().nullish(),
      Headers: zod.record(zod.string(), zod.unknown()).nullish(),
    })
  ),
});
export type InboundEmail = zod.infer<typeof inboundEmailSchema>["items"][number];

// Résultat d'un handler : `audit` (si présent) est ajouté au journal d'audit de la requête webhook.
export type InboundOutcome = { processed: boolean; audit?: AuditEvent };
