import { Router } from "express";
import { captureMessage, INVALID_BODY } from "../../error";
import { emailService } from "../../services/email";
import { BrevoInboundEmail } from "../../types/brevo";
import { EmailCreateInput } from "../../types/email";
import { downloadFile } from "./helpers/download-file";

const router = Router();

/**
 * Webhook for Brevo
 * The management of webhook are done using the Brevo API: https://api.brevo.com/v3/webhooks
 * Documentation webhooks: https://developers.brevo.com/reference/getwebhooks-1
 * Documentation inbound parsing: https://developers.brevo.com/reference/getinboundemailevents
 */
router.post("/", async (req, res, next) => {
  try {
    const body = req.body as { items: BrevoInboundEmail[] };

    if (!body.items || !Array.isArray(body.items)) {
      captureMessage("Invalid body", JSON.stringify(body, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Invalid body" });
    }

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];

      if (!item["Subject"].includes("Rapport LinkedIn")) {
        captureMessage("Email not a LinkedIn report", JSON.stringify(item, null, 2));
        continue;
      }

      const obj = {
        raw: item,
        messageId: item["MessageId"],
        inReplyTo: item["InReplyTo"],
        fromName: item["From"]["Name"],
        fromEmail: item["From"]["Address"],
        to: item["To"].map((to) => ({ name: to["Name"], email: to["Address"] })),
        subject: item["Subject"],
        sentAt: new Date(item["SentAtDate"]),
        rawTextBody: item["RawTextBody"],
        rawHtmlBody: item["RawHtmlBody"],
        mdTextBody: item["ExtractedMarkdownMessage"],
        attachments: item["Attachments"].map((attachment) => ({
          name: attachment["Name"],
          contentType: attachment["ContentType"],
          contentLength: attachment["ContentLength"],
          contentId: attachment["ContentId"],
          token: attachment["DownloadToken"],
        })),
        deletedAt: null,
      } as EmailCreateInput;

      const email = await emailService.createEmail(obj);
      const result = await downloadFile(email);
      if (!result) {
        continue;
      }
      await emailService.updateEmail(email.id, { fileObjectName: result.objectName, reportUrl: result.link });
    }
    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
