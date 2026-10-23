import { APP_URL, INBOUND_EMAIL_DOMAIN } from "@/config";
import type { AlertNotifier } from "@/services/alerts/notifiers/types";
import { alertReplyAddress } from "@/services/alerts/reply";
import { sendTemplate, TEMPLATE_IDS } from "@/services/brevo/email";
import { formatDate } from "@/utils/date";

// Les emails ne quittent jamais l'API. Template Brevo (TEMPLATE_IDS.WARNING_ALERT) géré dans Brevo ; params : firstname,
// publisherName, title, description, triggeredAtLabel, procedureUrl?, occurrences, alertsUrl, alertUrl. L'objet est défini ici.
export const mailNotifier: AlertNotifier = {
  name: "mail",
  required: true,
  async notify(warning, users) {
    let sent = 0;
    for (const user of users) {
      const { ok } = await sendTemplate(TEMPLATE_IDS.WARNING_ALERT, {
        emailTo: [user.email],
        // Une réponse à ce mail arrive sur /inbound-email (voir ../reply.ts) et résout l'alerte.
        ...(INBOUND_EMAIL_DOMAIN ? { replyTo: alertReplyAddress(warning.id, user.id) } : {}),
        subject: `[Alerte] ${warning.publisherName ?? "Annonceur"} : ${warning.title ?? warning.type}`,
        params: {
          firstname: user.firstname,
          publisherName: warning.publisherName,
          title: warning.title,
          description: warning.description,
          triggeredAt: warning.createdAt.toISOString(),
          triggeredAtLabel: formatDate(warning.createdAt),
          procedureUrl: warning.procedureUrl,
          occurrences: warning.occurrences,
          alertsUrl: `${APP_URL}/admin-warning`,
          alertUrl: `${APP_URL}/admin-warning/alerts/${warning.id}`,
        },
      });
      if (ok) {
        sent++;
      }
    }
    return sent > 0;
  },
};
