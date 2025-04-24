import { Schema, model, models } from "mongoose";

import { ModerationEvent } from "../types";

const MODELNAME = "moderation-event";
const schema = new Schema<ModerationEvent>(
  {
    missionId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    userId: { type: String, default: null },
    userName: { type: String, default: null },
    initialStatus: { type: String, enum: ["ACCEPTED", "REFUSED", "PENDING", "ONGOING", null], default: null },
    newStatus: { type: String, enum: ["ACCEPTED", "REFUSED", "PENDING", "ONGOING", null], default: null },
    initialTitle: { type: String, default: null },
    newTitle: { type: String, default: null },
    initialComment: { type: String, default: null },
    newComment: { type: String, default: null },
    initialNote: { type: String, default: null },
    newNote: { type: String, default: null },
    initialSiren: { type: String, default: null },
    newSiren: { type: String, default: null },
    initialRNA: { type: String, default: null },
    newRNA: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

const ModerationEventModel = models[MODELNAME] || model<ModerationEvent>(MODELNAME, schema);
export default ModerationEventModel;
