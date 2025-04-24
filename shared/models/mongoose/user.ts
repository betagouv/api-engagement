import bcrypt from "bcryptjs";
import { Schema, model, models } from "mongoose";
import { User } from "../../types/index.d";

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
    required: true,
    documentation: {
      description: "List Publisher id",
    },
  },
  email: {
    type: String,
    required: true,
    trim: true,
    documentation: {
      description: "Contact email address of the user",
    },
  },
  password: {
    type: String,
    documentation: {
      description: "Password used for authentication",
    },
  },
  deleted: {
    type: Boolean,
    default: false,
    documentation: {
      description: "Is user deleted",
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
      description: "Expiry date of password reset token",
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
      description: "Date of signup completion",
    },
  },
  brevoContactId: { 
    type: Number, 
    default: null,
    documentation: {
      description: "Brevo contact ID for email marketing",
    },
  },
}, {
  timestamps: {
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
});

schema.pre("save", function (next) {
  this.updated_at = new Date();
  if (this.isModified("password") && this.password) {
    bcrypt.hash(this.password, 10, (e, hash) => {
      this.password = hash || "";
      return next();
    });
  } else {
    return next();
  }
});

schema.methods.comparePassword = function (password: string) {
  return bcrypt.compare(password, this.password || "");
};

// Indexes
schema.index({ email: 1 }, { unique: true });
schema.index({ publishers: 1 });
schema.index({ role: 1 });
schema.index({ deleted: 1 });
schema.index({ invitationToken: 1 });
schema.index({ brevoContactId: 1 });

const UserModel = models[MODELNAME] || model<User>(MODELNAME, schema);

export { UserModel };
