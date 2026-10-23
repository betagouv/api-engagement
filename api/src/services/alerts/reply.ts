import { createHmac, timingSafeEqual } from "node:crypto";

import { SECRET } from "@/config";
import { captureMessage } from "@/error";
import { buildInboundAddress } from "@/services/inbound-email/address";
import type { InboundEmail, InboundOutcome } from "@/services/inbound-email/types";
import { userService } from "@/services/user";
import { warningService } from "@/services/warning";
import { warningCommentService } from "@/services/warning-comment";
import { isUniqueViolation } from "@/utils/prisma";

export const ALERT_REPLY_PREFIX = "alerte";

// Signature de l'adresse de réponse : l'id d'une alerte circule (URL admin, logs, Sentry), pas le droit d'y répondre.
const sign = (warningId: string) => createHmac("sha256", SECRET).update(`alert-reply:${warningId}`).digest("hex").slice(0, 16);

// Adresse de réponse d'une alerte `alerte-<id>.<signature>@domaine` (local-part < 64 caractères, limite RFC 5321).
export const alertReplyAddress = (warningId: string) => buildInboundAddress(ALERT_REPLY_PREFIX, `${warningId}.${sign(warningId)}`);

// Renvoie l'id de l'alerte si la signature de l'adresse est valide.
const verifyReplyToken = (token: string): string | null => {
  const [warningId, signature = ""] = token.split(".");
  const expected = Buffer.from(sign(warningId));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received) ? warningId : null;
};

// Traite une réponse mail (préfixe `alerte`, voir services/inbound-email) : l'expéditeur doit être un assigné de l'alerte ou un admin ; l'alerte passe en RESOLVED
// et le corps de la réponse (citations retirées par Brevo) devient un commentaire.
export const processReply = async (mail: InboundEmail, token: string): Promise<InboundOutcome> => {
  const warningId = verifyReplyToken(token);
  if (!warningId) {
    return { processed: false, audit: { action: "alert.reply.rejected", outcome: "denied", metadata: { reason: "invalid_token" } } };
  }
  const warning = await warningService.findWarningById(warningId);
  if (!warning) {
    return { processed: false };
  }
  const target = { type: "warning", id: warning.id };
  const sender = await userService.findUserByEmail(mail.From.Address.trim(), { ignoreCase: true });
  if (!sender || sender.deletedAt || (sender.role !== "admin" && !warning.assignees.some((a) => a.id === sender.id))) {
    captureMessage("Alert reply rejected: sender not allowed", { extra: { warningId: warning.id } });
    return { processed: false, audit: { action: "alert.reply.rejected", outcome: "denied", target } };
  }

  // Résoudre d'abord (idempotent) : si le commentaire échoue, le rejeu du webhook par Brevo termine le traitement.
  if (warning.status !== "RESOLVED") {
    await warningService.updateWarning(warning.id, { status: "RESOLVED" });
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
