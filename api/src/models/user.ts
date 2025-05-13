import bcrypt from "bcryptjs";
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

schema.index({ deletedAt: 1 });

schema.pre("save", function (next) {
  this.updatedAt = new Date();
  if (this.isModified("password") && this.password) {
    bcrypt.hash(this.password, 10, (e, hash) => {
      this.password = hash || null;
      return next();
    });
  } else {
    return next();
  }
});

schema.methods.comparePassword = function (password: string) {
  return bcrypt.compare(password, this.password || "");
};

const obj = model<User>(MODELNAME, schema);
export default obj;
