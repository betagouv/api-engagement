import { Schema, model } from "mongoose";

import { Email } from "../types";

const MODELNAME = "email";

const schema = new Schema<Email>(
  {
    messageId: { type: String },
    inReplyTo: { type: String },
    fromName: { type: String },
    fromEmail: { type: String },
    to: {
      type: [
        {
          name: { type: String },
          email: { type: String },
        },
      ],
    },

    subject: { type: String },
    sentAt: { type: Date },
    rawTextBody: { type: String },
    rawHtmlBody: { type: String },
    mdTextBody: { type: String },

    attachments: {
      type: [
        {
          name: { type: String },
          contentType: { type: String },
          contentLength: { type: Number },
          contentId: { type: String },
          token: { type: String },
          url: { type: String },
        },
      ],
    },

    raw: { type: Object },

    status: { type: String, default: "PENDING" },
    reportUrl: { type: String, default: null },
    fileObjectName: { type: String, default: null },
    dateFrom: { type: Date, default: null },
    dateTo: { type: Date, default: null },
    createdCount: { type: Number, default: null },
    failed: { type: Object, default: null },
  },
  { timestamps: true }
);

const EmailModel = model<Email>(MODELNAME, schema);
export default EmailModel;
