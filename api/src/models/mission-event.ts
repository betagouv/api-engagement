import { Schema, model } from "mongoose";

import { MissionEvent } from "../types";

const MODELNAME = "mission-event";

const schema = new Schema<MissionEvent>(
  {
    type: { type: String, required: true, default: "update", enum: ["create", "update", "delete"] },
    missionId: { type: Schema.Types.ObjectId, ref: "Mission", required: true },
    changes: { type: Object, default: null },
    fields: { type: [String], required: true },
    createdBy: { type: String },
    // PG export
    lastExportedToPgAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const MissionEventModel = model<MissionEvent>(MODELNAME, schema);
export default MissionEventModel;
