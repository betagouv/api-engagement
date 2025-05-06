import { ENV, SENDINBLUE_APIKEY } from "../config";
import { captureException } from "../error";

interface EmailOptions {
  params: Record<string, any>;
  emailTo: string[];
  subject?: string;
  emailBcc?: string[];
  attachment?: any;
  tags?: string[];
}

interface EmailBody {
  subject?: string;
  templateId?: number;
  params?: Record<string, any>;
  to: {
    email: string;
  }[];
  bcc?: {
    email: string;
  }[];
  attachment?: any;
  tags?: string[];
}

const api = async (path: string, body = {}, method = "POST") => {
  if (!SENDINBLUE_APIKEY) {
    return { ok: false, data: "SENDINBLUE_APIKEY is undefined" };
  }
  const options = {
    method,
    headers: {
      "api-key": SENDINBLUE_APIKEY,
    },
  } as { [key: string]: any };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`https://api.sendinblue.com/v3${path}`, options);
  // if res content-type is application/json, return res.json()
  if (res.headers.get("content-type")?.includes("application/json")) {
    return { ok: res.ok, data: await res.json() };
  }
  return { ok: res.ok, data: res };
};

// const api = async (path: string, body = {}) => {

//   const res = await fetch(`https://api.sendinblue.com/v3${path}`, {
//     method: "POST",
//     headers: {
//       "api-key": SENDINBLUE_APIKEY,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(body),
//   });
//   return { ok: res.ok, data: await res.json() };
// };

export const sendTemplate = async (templateId: number, options: EmailOptions) => {
  try {
    const body = {
      templateId,
      to: options.emailTo.map((email) => ({ email })),
    } as EmailBody;

    if (options.emailBcc) {
      body.bcc = options.emailBcc.map((email) => ({ email }));
    }
    if (options.subject) {
      body.subject = options.subject;
    }
    if (options.params) {
      body.params = options.params;
    }
    if (options.attachment) {
      body.attachment = options.attachment;
    }
    if (options.tags) {
      body.tags = options.tags;
    }

    if (ENV === "development") {
      console.log(`---- EMAIL ----`);
      console.log(`[to]: ${JSON.stringify(body.to, null, 2)}`);
      console.log(`[template]: ${body.templateId}`);
      console.log(`[subject]: ${body.subject}`);
      console.log(`[params]: ${JSON.stringify(body.params, null, 2)}`);
      console.log(`---- EMAIL ----`);
      return true;
    } else {
      return await api("/smtp/email", body);
    }
  } catch (e) {
    captureException(e, "sendTemplate");
  }
};

export const downloadAttachment = async (token: string) => {
  try {
    const res = await api(`/inbound/attachments/${token}`, {}, "GET");
    if (!res.ok) {
      throw res.data;
    }
    // send buffer
    const buffer = await res.data.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    captureException(error);
  }
};
