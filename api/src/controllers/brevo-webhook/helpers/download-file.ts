import { captureException } from "@/error";
import { putObject } from "@/services/s3";
import { EmailRecord } from "@/types/email";
import { ExtractLinkedinReportLinkParams, extractLinkedinReportLink } from "@/controllers/brevo-webhook/helpers/link-extractor";

export const downloadFile = async (email: EmailRecord) => {
  try {
    const link = extractLinkedinReportLink(email as ExtractLinkedinReportLinkParams);

    if (!link) {
      captureException("[Linkedin Stats] No link found", `No link found in email ${email.id}`);
      return null;
    }

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

    return { link, objectName };
  } catch (error: any) {
    captureException(error, { extra: { emailId: email.id } });
    return null;
  }
};
