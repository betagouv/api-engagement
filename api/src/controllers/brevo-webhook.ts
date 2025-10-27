import { Router } from "express";
import { captureException, captureMessage, INVALID_BODY } from "../error";
import { emailRepository } from "../repositories/email";
import { putObject } from "../services/s3";
import { BrevoInboundEmail } from "../types/brevo";
import { EmailCreateInput, EmailRecord } from "../types/email";

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

      const email = await emailRepository.create(obj);
      const objectName = await downloadFile(email);
      if (objectName) {
        await emailRepository.update(email.id, { fileObjectName: objectName });
      }
    }
    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

const downloadFile = async (email: EmailRecord) => {
  try {
    if (!email.mdTextBody) {
      return null;
    }

    // find link the md_text_body of the text [Download report](https://www.linkedin.com/e/v2?...)
    const match = email.mdTextBody.match(/\[Download report\]\((https:\/\/www\.linkedin\.com\/e\/v2\?[^)]+)\)/);
    if (!match) {
      captureException("[Linkedin Stats] No link found", `No link found in email ${email.id}`);
      return;
    }

    const link = match[0].slice("[Download report](".length, -1).replaceAll("&amp;", "&");
    console.log(`[Linkedin Stats] Found link in email ${email.id}: ${link}`);

    const response = await fetch(link);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${link}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    const objectName = `linkedin-report/${email.id}.xlsx`;
    const res = await putObject(objectName, Buffer.from(arrayBuffer));
    if (res instanceof Error) {
      throw new Error(`Failed to upload to S3 ${res}`);
    }

    return objectName;
  } catch (error: any) {
    captureMessage("Failed to download attachment", error.message);
  }
};

export default router;
