import { createHmac, timingSafeEqual } from "node:crypto";

import { SECRET } from "@/config";
import { captureMessage } from "@/error";
import { refreshSlackMessage } from "@/services/alerts/notifiers/slack";
import { buildInboundAddress } from "@/services/inbound-email/address";
import type { InboundEmail, InboundOutcome } from "@/services/inbound-email/types";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import { warningCommentService } from "@/services/warning-comment";
import { isUniqueViolation } from "@/utils/prisma";

export const ALERT_REPLY_PREFIX = "alerte";

// Signature de l'adresse de réponse, propre à (alerte, destinataire) : l'id d'une alerte circule (URL admin, logs, Sentry), pas le droit d'y répondre.
// L'adresse identifie celui qui répond : peu importe l'adresse `From` (alias, transfert, autre messagerie).
const sign = (warningId: string, userId: string) => createHmac("sha256", SECRET).update(`alert-reply:${warningId}:${userId}`).digest("hex").slice(0, 16);

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Adresse de réponse d'une alerte pour un destinataire `alerte-<id>.<signature>@domaine` (local-part < 64 caractères, limite RFC 5321).
export const alertReplyAddress = (warningId: string, userId: string) => buildInboundAddress(ALERT_REPLY_PREFIX, `${warningId}.${sign(warningId, userId)}`);

// Traite une réponse mail (préfixe `alerte`, voir services/inbound-email) : la signature de l'adresse désigne un assigné de l'alerte, qui devient l'auteur ;
// l'alerte passe en RESOLVED et le corps de la réponse (citations retirées par Brevo) devient un commentaire.
export const processReply = async (mail: InboundEmail, token: string): Promise<InboundOutcome> => {
  const [warningId, signature = ""] = token.split(".");
  const warning = await warningService.findWarningById(warningId);
  if (!warning) {
    return { processed: false };
  }
  const target = { type: "warning", id: warning.id };
  const assignee = warning.assignees.find((a) => safeEqual(sign(warning.id, a.id), signature));
  const sender = assignee ? await userService.findUserById(assignee.id) : null;
  if (!sender) {
    captureMessage("Alert reply rejected: invalid reply address", { extra: { warningId: warning.id } });
    return { processed: false, audit: { action: "alert.reply.rejected", outcome: "denied", target } };
  }

  // Résoudre d'abord (idempotent) : si le commentaire échoue, le rejeu du webhook par Brevo termine le traitement.
  if (warning.status !== "RESOLVED") {
    await warningService.updateWarning(warning.id, { status: "RESOLVED" });
    await refreshSlackMessage(warning.id, sender.firstname);
  }
  const body = (mail.ExtractedMarkdownMessage ?? mail.RawTextBody ?? "").trim().slice(0, 5000);
  if (body) {
    try {
      await warningCommentService.createComment({ warningId: warning.id, authorId: sender.id, body, emailMessageId: mail.MessageId });
    } catch (error) {
      // Commentaire déjà enregistré (Brevo rejoue le webhook) : rien à refaire.
      if (isUniqueViolation(error)) {
        return { processed: false };
      }
      throw error;
    }
  }
  return { processed: true, audit: { action: "alert.resolve_by_email", outcome: "success", target, metadata: { senderId: sender.id, commentAdded: Boolean(body) } } };
};
