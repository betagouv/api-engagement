import { Schema, model } from "mongoose";

import { User } from "../types";

const MODELNAME = "user";
const schema = new Schema<User>(
  {
    firstname: { type: String, trim: true, required: true },
    lastname: { type: String, trim: true },
    publishers: { type: [String], required: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },

    invitationToken: { type: String },
    invitationExpiresAt: { type: Date },
    invitationCompletedAt: { type: Date },

    lastActivityAt: { type: Date },
    loginAt: { type: [Date] },

    forgotPasswordToken: { type: String, default: null },
    forgotPasswordExpiresAt: { type: Date, default: null },

    deletedAt: { type: Date, default: null },

    brevoContactId: { type: Number, default: null },
  },
  {
    timestamps: true,
  }
);

const UserModel = model<User>(MODELNAME, schema);
export default UserModel;
