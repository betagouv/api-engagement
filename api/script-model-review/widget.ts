/**
 * Script to clean the data in the data base. It has 2 differents parts:
 * - refactoFields: Refactor / Rename the fields in the document to stick to a better naming convention
 * - cleanUnusedFields: Clean the unused fields in the document
 */

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import mongoose from "mongoose";
import "../src/db/mongo";

import WidgetModel from "../src/models/widget";

const cleanUnusedFields = async (widget: any) => {
  const allFields = Object.keys(widget);
  const schemaFields = Object.keys(WidgetModel.schema.paths);
  const extraFields = allFields.filter((field) => !schemaFields.includes(field));

  if (extraFields.length === 0) {
    console.log(`Widget ${widget._id} has no extra fields`);
    return;
  }

  console.log(`Widget ${widget._id} has ${extraFields.join(", ")} as extra fields`);

  const unset: any = {};
  for (const field of extraFields) {
    unset[field] = 1;
  }
  await mongoose.connection.db
    .collection("widgets")
    .updateOne({ _id: widget._id }, { $unset: unset });
  console.log(`Widget ${widget._id} cleaned`);
};

const refactoFields = async (widget: any) => {
  const updates: any = {};
  updates.deletedAt = widget.deleted ? widget.updatedAt : null;

  await mongoose.connection.db
    .collection("widgets")
    .updateOne({ _id: widget._id }, { $set: updates });
  console.log(`Widget ${widget._id} updated`);
};

const main = async () => {
  // Wait 3s to make sure the connection is established
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const widgets = await mongoose.connection.db.collection("widgets").find({}).toArray();
  console.log(`Found ${widgets.length} widgets`);

  for (const widget of widgets) {
    await refactoFields(widget);
    await cleanUnusedFields(widget);
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
