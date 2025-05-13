import { Router } from "express";
import { captureException, captureMessage } from "../error";
import EmailModel from "../models/email";
import { putObject } from "../services/s3";
import { Email } from "../types";
import { BrevoInboundEmail } from "../types/brevo";

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

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];

      if (!item["Subject"].includes("Rapport LinkedIn")) {
        captureMessage("Email not a LinkedIn report", JSON.stringify(item, null, 2));
        continue;
      }

      const obj = {
        raw: item,
        message_id: item["MessageId"],
        in_reply_to: item["InReplyTo"],
        from_name: item["From"]["Name"],
        from_email: item["From"]["Address"],
        to: item["To"].map((to) => ({ name: to["Name"], email: to["Address"] })),
        subject: item["Subject"],
        sent_at: new Date(item["SentAtDate"]),
        raw_text_body: item["RawTextBody"],
        raw_html_body: item["RawHtmlBody"],
        md_text_body: item["ExtractedMarkdownMessage"],

        attachments: item["Attachments"].map((attachment) => ({
          name: attachment["Name"],
          content_type: attachment["ContentType"],
          content_length: attachment["ContentLength"],
          content_id: attachment["ContentId"],
          token: attachment["DownloadToken"],
        })),
        deleted_at: null,
      };

      const email = await EmailModel.create(obj);
      const objectName = await downloadFile(email);
      if (objectName) {
        email.file_object_name = objectName;
      }
      await email.save();
    }
    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

const downloadFile = async (email: Email) => {
  try {
    if (!email.md_text_body) {
      return null;
    }

    // find link the md_text_body of the text [Download report](https://www.linkedin.com/e/v2?...)
    const match = email.md_text_body.match(/\[Download report\]\((https:\/\/www.linkedin.com\/e\/v2\?[^)]+)\)/);
    if (!match) {
      captureException("[Linkedin Stats] No link found", `No link found in email ${email._id}`);
      return;
    }
    const link = match[0].slice("[Download report](".length, -1).replaceAll("&amp;", "&");
    console.log(`[Linkedin Stats] Found link in email ${email._id}: ${link}`);

    const response = await fetch(link);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${link}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    const objectName = `linkedin-report/${email._id}.xlsx`;
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
