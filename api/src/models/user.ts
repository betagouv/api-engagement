import bcrypt from "bcryptjs";
import { Schema, model } from "mongoose";

import { User } from "../types";

const MODELNAME = "user";
const schema = new Schema<User>({
  firstname: {
    type: String,
    trim: true,
    required: true,
    documentation: {
      description: "Full name of the user",
    },
  },
  lastname: {
    type: String,
    trim: true,
    documentation: {
      description: "Full name of the user",
    },
  },

  publishers: {
    type: [String],
    documentation: {
      description: "List Publisher id",
    },
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    documentation: {
      description: "Contact email address of the user",
    },
  },

  password: {
    type: String,
    documentation: {
      description: "Password used for authentation",
    },
  },

  deleted: {
    type: Boolean,
    default: false,
    documentation: {
      description: "Is user deleted",
    },
  },

  created_at: {
    type: Date,
    default: Date.now,
    documentation: {
      generated: true,
      description: "Date of creation",
    },
  },
  updated_at: {
    type: Date,
    default: Date.now,
    documentation: {
      generated: true,
      description: "Date of last changes",
    },
  },
  last_activity_at: {
    type: Date,
    documentation: {
      generated: true,
      description: "Date of last activity",
    },
  },
  last_login_at: {
    type: Date,
    documentation: {
      generated: true,
      description: "Last date of login",
    },
  },
  login_at: {
    type: [Date],
  },
  forgot_password_reset_token: {
    type: String,
    default: "",
    documentation: {
      generated: true,
      description: "Password reset token",
    },
  },
  forgot_password_reset_expires: {
    type: Date,
    documentation: {
      generated: true,
      description: "Expiry date of password reset token ",
    },
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    documentation: {
      description: "The role of user",
    },
  },
  invitationToken: { type: String },
  invitationExpiresAt: { type: Date },
  invitationCompletedAt: {
    type: Date,
    documentation: {
      generated: true,
      description: "Date of singup completion",
    },
  },
});

schema.pre("save", function (next) {
  this.updated_at = new Date();
  if (this.isModified("password") && this.password) {
    bcrypt.hash(this.password, 10, (e, hash) => {
      this.password = hash;
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
