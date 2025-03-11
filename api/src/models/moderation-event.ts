import { Schema, model } from "mongoose";

import { ModerationEvent } from "../types";

const MODELNAME = "moderation-event";
const schema = new Schema<ModerationEvent>(
  {
    missionId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    userId: { type: String },
    userName: { type: String },
    initialStatus: { type: String, enum: ["ACCEPTED", "REFUSED", "PENDING", "ONGOING"] },
    newStatus: { type: String, enum: ["ACCEPTED", "REFUSED", "PENDING", "ONGOING", ""] },
    initialTitle: { type: String },
    newTitle: { type: String },
    initialComment: { type: String },
    newComment: { type: String },
    initialNote: { type: String },
    newNote: { type: String },
    initialSiren: { type: String },
    newSiren: { type: String },
    initialRNA: { type: String },
    newRNA: { type: String },
  },
  {
    timestamps: true,
  },
);

const ModerationEventModel = model<ModerationEvent>(MODELNAME, schema);
export default ModerationEventModel;
