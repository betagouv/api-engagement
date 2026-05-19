import { downloadFile } from "@/controllers/brevo-webhook/helpers/download-file";
import { INVALID_BODY } from "@/error";
import { brevoWebhookSecurity } from "@/middlewares/brevo-webhook";
import { publisherRateLimiter } from "@/middlewares/rate-limit";
import { emailService } from "@/services/email";
import { EmailCreateInput } from "@/types/email";
import { Router } from "express";
import { z } from "zod";

const router = Router();
router.use(publisherRateLimiter);
router.use(brevoWebhookSecurity);

const mailboxSchema = z.object({
  Name: z.string(),
  Address: z.string().email(),
});

const attachmentSchema = z.object({
  Name: z.string(),
  ContentType: z.string(),
  ContentLength: z.number(),
  ContentId: z.string(),
  DownloadToken: z.string(),
});

const brevoInboundEmailSchema = z.object({
  MessageId: z.string(),
  InReplyTo: z.string().optional(),
  From: mailboxSchema,
  To: z.array(mailboxSchema),
  SentAtDate: z.string(),
  Subject: z.string(),
  RawHtmlBody: z.string().optional(),
  RawTextBody: z.string().optional(),
  ExtractedMarkdownMessage: z.string().optional(),
  Attachments: z.array(attachmentSchema),
});

const brevoWebhookSchema = z.object({
  items: z.array(brevoInboundEmailSchema).min(1),
});

/**
 * Webhook for Brevo
 * The management of webhook are done using the Brevo API: https://api.brevo.com/v3/webhooks
 * Documentation webhooks: https://developers.brevo.com/reference/getwebhooks-1
 * Documentation inbound parsing: https://developers.brevo.com/reference/getinboundemailevents
 */
router.post("/", async (req, res, next) => {
  try {
    const body = brevoWebhookSchema.safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Invalid body" });
    }

    for (let i = 0; i < body.data.items.length; i++) {
      const item = body.data.items[i];

      if (!item["Subject"].includes("Rapport LinkedIn")) {
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
