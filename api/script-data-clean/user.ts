/**
 * Script to clean the data in the data base. It has 2 differents parts:
 * - refactoFields: Refactor / Rename the fields in the document to stick to a better naming convention
 * - cleanUnusedFields: Clean the unused fields in the document
 */

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import mongoose from "mongoose";
import "../src/db/mongo";

import UserModel from "../src/models/user";

const cleanUnusedFields = async (user: any) => {
  const allFields = Object.keys(user);
  const schemaFields = Object.keys(UserModel.schema.paths);
  const extraFields = allFields.filter((field) => !schemaFields.includes(field));

  if (extraFields.length === 0) {
    console.log(`User ${user._id} has no extra fields`);
    return;
  }

  console.log(`User ${user._id} has ${extraFields.join(", ")} as extra fields`);

  const unset: any = {};
  for (const field of extraFields) {
    unset[field] = 1;
  }
  await mongoose.connection.db.collection("users").updateOne({ _id: user._id }, { $unset: unset });
  console.log(`User ${user._id} cleaned`);
};

const refactoFields = async (user: any) => {
  const updates: any = {};
  updates.deletedAt = user.deleted ? user.updatedAt : null;
  updates.createdAt = user.created_at;
  updates.updatedAt = user.updated_at;
  updates.lastActivityAt = user.last_activity_at;
  updates.loginAt = user.login_at;
  updates.forgotPasswordToken = user.forgot_password_reset_token || null;
  updates.forgotPasswordExpiresAt = user.forgot_password_reset_expires || null;

  // Update without the schema cause the timestamps would not set correctly
  await mongoose.connection.db.collection("users").updateOne({ _id: user._id }, { $set: updates });

  console.log(`User ${user._id} updated`);
};

const main = async () => {
  // Wait 3s to make sure the connection is established
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const users = await mongoose.connection.db.collection("users").find({}).toArray();
  console.log(`Found ${users.length} users`);

  for (const user of users) {
    await refactoFields(user);
    await cleanUnusedFields(user);
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
