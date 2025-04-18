import { Schema, model } from "mongoose";

const MODELNAME = "user";

const schema = new Schema(
  {
    _old_id: { type: String },
    forgot_password_reset_token: { type: String },
    role: { type: String },
    password: { type: String },
    email: { type: String, required: true },
    last_login_at: { type: Date, default: Date.now },
    first_name: { type: String },
    last_name: { type: String },
    invitation_completed_at: { type: Date, default: Date.now },
    deleted_at: { type: Date },
  },
  {
    timestamps: true,
  },
);

// Indexes
schema.index({ email: 1 }, { unique: true });
schema.index({ role: 1 });

// Export du modu00e8le
const UserModel = model(MODELNAME, schema);
export default UserModel;

// Export d'une fonction pour obtenir le modu00e8le
export function getUserModel() {
  return UserModel;
}
