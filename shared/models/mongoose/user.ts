import bcrypt from "bcryptjs";
import { Schema, model, models } from "mongoose";

import { User } from "../../types";

const MODELNAME = "user";
const schema = new Schema<User>(
  {
    firstname: { type: String, trim: true, required: true },
    lastname: { type: String, trim: true },
    publishers: { type: [String], required: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String },
    deleted: { type: Boolean, default: false },
    last_activity_at: { type: Date },
    last_login_at: { type: Date },
    login_at: { type: [Date] },
    forgot_password_reset_token: { type: String, default: "" },
    forgot_password_reset_expires: { type: Date },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    invitationToken: { type: String },
    invitationExpiresAt: { type: Date },
    invitationCompletedAt: { type: Date },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

schema.pre("save", function (next) {
  this.updated_at = new Date();
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

const UserModel = models[MODELNAME] || model<User>(MODELNAME, schema);

export { UserModel };