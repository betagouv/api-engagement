import { Schema, model } from "mongoose";

import { Email } from "../types";

const MODELNAME = "email";

const schema = new Schema<Email>({
  message_id: { type: String },
  in_reply_to: { type: String },
  from_name: { type: String },
  from_email: { type: String },
  to: {
    type: [
      {
        name: { type: String },
        email: { type: String },
      },
    ],
  },

  subject: { type: String },
  sent_at: { type: Date },
  raw_text_body: { type: String },
  raw_html_body: { type: String },
  md_text_body: { type: String },

  attachments: {
    type: [
      {
        name: { type: String },
        content_type: { type: String },
        content_length: { type: Number },
        content_id: { type: String },
        token: { type: String },
        url: { type: String },
      },
    ],
  },

  raw: { type: Object },

  status: {
    type: String,
    enum: ["PENDING", "PROCESSED", "FAILED", "DUPLICATE"],
    default: "PENDING",
  },
  report_url: { type: String, default: null },
  file_object_name: { type: String, default: null },
  date_from: { type: Date, default: null },
  date_to: { type: Date, default: null },
  created_count: { type: Number, default: null },
  failed: { type: Object, default: null },

  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const EmailModel = model<Email>(MODELNAME, schema);
export default EmailModel;
