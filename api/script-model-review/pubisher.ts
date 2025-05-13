/**
 * Script to clean the data in the data base. It has 2 differents parts:
 * - refactoFields: Refactor / Rename the fields in the document to stick to a better naming convention
 * - cleanUnusedFields: Clean the unused fields in the document
 */

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import mongoose from "mongoose";
import "../src/db/mongo";

import PublisherModel from "../../process/src/models/publisher";

const cleanUnusedFields = async (publisher: any) => {
  const allFields = Object.keys(publisher);
  const schemaFields = Object.keys(PublisherModel.schema.paths);
  const extraFields = allFields.filter((field) => !schemaFields.includes(field));

  if (extraFields.length === 0) {
    console.log(`Publisher ${publisher._id} has no extra fields`);
    return;
  }

  console.log(`Publisher ${publisher._id} has ${extraFields.join(", ")} as extra fields`);

  const unset: any = {};
  for (const field of extraFields) {
    unset[field] = 1;
  }
  if (!mongoose.connection.db) {
    throw new Error("Database not connected");
  }
  await mongoose.connection.db.collection("publishers").updateOne({ _id: publisher._id }, { $unset: unset });
  console.log(`Publisher ${publisher._id} cleaned`);
};

const refactoFields = async (publisher: any) => {
  const updates: any = {};
  updates.deletedAt = publisher.deletedAt || publisher.deleted_at || null;
  updates.createdAt = publisher.createdAt || publisher.created_at;
  updates.updatedAt = publisher.updatedAt || publisher.updated_at;
  updates.missionType = publisher.missionType || publisher.mission_type;

  updates.annonceur = publisher.annonceur || publisher.role_promoteur;
  updates.api = publisher.api || publisher.role_annonceur_api;
  updates.widget = publisher.widget || publisher.role_annonceur_widget;
  updates.campaign = publisher.campaign || publisher.role_annonceur_campagne;

  updates.sendReport = publisher.automated_report;
  updates.sendReportTo = publisher.send_report_to;

  // Update without the schema cause the timestamps would not set correctly
  if (!mongoose.connection.db) {
    throw new Error("Database not connected");
  }
  await mongoose.connection.db.collection("publishers").updateOne({ _id: publisher._id }, { $set: updates });

  console.log(`Publisher ${publisher._id} updated`);
};

const main = async () => {
  // Wait 3s to make sure the connection is established
  await new Promise((resolve) => setTimeout(resolve, 3000));

  if (!mongoose.connection.db) {
    throw new Error("Database not connected");
  }

  const publishers = await mongoose.connection.db.collection("publishers").find({}).toArray();
  console.log(`Found ${publishers.length} publishers`);

  for (const publisher of publishers) {
    await refactoFields(publisher);
    // await cleanUnusedFields(publisher); Clean the unused fields in a second step after it's merge to not lose data
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
