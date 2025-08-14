/**
 * Script to clean the data in the data base. It has 2 differents parts:
 * - refactoFields: Refactor / Rename the fields in the document to stick to a better naming convention
 * - cleanUnusedFields: Clean the unused fields in the document
 */

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import mongoose from "mongoose";
import "../src/db/mongo";

import EmailModel from "../src/models/email";

const cleanUnusedFields = async (email: any) => {
  const allFields = Object.keys(email);
  const schemaFields = Object.keys(EmailModel.schema.paths);
  const extraFields = allFields.filter((field) => !schemaFields.includes(field));

  if (extraFields.length === 0) {
    console.log(`Email ${email._id} has no extra fields`);
    return;
  }

  console.log(`Email ${email._id} has ${extraFields.join(", ")} as extra fields`);

  const unset: any = {};
  for (const field of extraFields) {
    unset[field] = 1;
  }
  await mongoose.connection.db.collection("emails").updateOne({ _id: email._id }, { $unset: unset });
  console.log(`Email ${email._id} cleaned`);
};

const refactoFields = async (email: any) => {
  const updates: any = {};

  updates.messageId = email.messageId || email.message_id;
  updates.inReplyTo = email.inReplyTo || email.in_reply_to;
  updates.fromName = email.fromName || email.from_name;
  updates.fromEmail = email.fromEmail || email.from_email;

  updates.sentAt = email.sentAt || email.sent_at;
  updates.rawTextBody = email.rawTextBody || email.raw_text_body;
  updates.rawHtmlBody = email.rawHtmlBody || email.raw_html_body;
  updates.mdTextBody = email.mdTextBody || email.md_text_body;

  updates.attachments = (email.attachments || email.attachments).map((attachment: any) => ({
    name: attachment.name,
    contentType: attachment.contentType || attachment.content_type,
    contentLength: attachment.contentLength || attachment.content_length,
    contentId: attachment.contentId || attachment.content_id,
    token: attachment.token,
    url: attachment.url,
  }));

  updates.reportUrl = email.reportUrl || email.report_url;
  updates.fileObjectName = email.fileObjectName || email.file_object_name;
  updates.dateFrom = email.dateFrom || email.date_from;
  updates.dateTo = email.dateTo || email.date_to;
  updates.createdCount = email.createdCount || email.created_count;

  updates.deletedAt = email.deletedAt || email.deleted_at;
  updates.createdAt = email.createdAt || email.created_at;
  updates.updatedAt = email.updatedAt || email.updated_at;

  // Update without the schema cause the timestamps would not set correctly
  await mongoose.connection.db.collection("emails").updateOne({ _id: email._id }, { $set: updates });

  console.log(`Email ${email._id} updated`);
};

const main = async () => {
  // Wait 3s to make sure the connection is established
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const emails = await mongoose.connection.db.collection("emails").find({}).toArray();
  console.log(`Found ${emails.length} emails`);

  for (const email of emails) {
    await refactoFields(email);
    // await cleanUnusedFields(email);
  }
};

if (require.main === module) {
  const start = new Date();
  console.log("Start migration at ", start.toLocaleString());
  main()
    .then(() => {
      console.log("Total time", (Date.now() - start.getTime()) / 1000, "seconds");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
