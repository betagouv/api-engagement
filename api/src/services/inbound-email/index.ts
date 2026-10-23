import { ALERT_REPLY_PREFIX, processReply } from "@/services/alerts/reply";
import type { AuditEvent } from "@/utils/audit-log";
import { parseInboundAddress } from "./address";
import type { InboundEmail, InboundOutcome } from "./types";

// Fonctions déclenchées par mail entrant, par préfixe d'adresse (voir ./address.ts).
// Un handler reçoit le mail et l'id extrait de l'adresse, et renvoie le résultat (traité ou non, événement d'audit).
// Pour une nouvelle fonction : ajouter son préfixe ici.
const handlers: Record<string, (mail: InboundEmail, id: string) => Promise<InboundOutcome>> = {
  [ALERT_REPLY_PREFIX]: processReply,
};

// Réponses automatiques (absence, accusé de réception) : jamais une action de l'utilisateur (RFC 3834).
export const isAutoReply = (headers: InboundEmail["Headers"]): boolean => {
  const h = Object.fromEntries(Object.entries(headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v).toLowerCase()]));
  return (
    (h["auto-submitted"] !== undefined && h["auto-submitted"] !== "no") || "x-autoreply" in h || "x-autorespond" in h || ["bulk", "junk", "auto_reply"].includes(h["precedence"])
  );
};

// Route chaque mail vers le handler du premier destinataire reconnu ; renvoie le nombre de mails traités et les événements d'audit.
export const processInboundEmails = async (mails: InboundEmail[]): Promise<{ processed: number; audits: AuditEvent[] }> => {
  let processed = 0;
  const audits: AuditEvent[] = [];
  for (const mail of mails) {
    if (isAutoReply(mail.Headers)) {
      continue;
    }
    const addresses = [...(mail.Recipients ?? []), ...(mail.To ?? []).map((t) => t.Address)];
    for (const address of addresses) {
      const target = parseInboundAddress(address);
      const handler = target && Object.prototype.hasOwnProperty.call(handlers, target.prefix) ? handlers[target.prefix] : undefined;
      if (target && handler) {
        const outcome = await handler(mail, target.id);
        if (outcome.processed) {
          processed++;
        }
        if (outcome.audit) {
          audits.push(outcome.audit);
        }
        break;
      }
    }
  }
  return { processed, audits };
};
