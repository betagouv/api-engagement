import { Schema, model } from "mongoose";

import { Stats } from "../types";

const MODELNAME = "stats";


const schema = new Schema<Stats>({
  clickId: { type: String },
  requestId: { type: String },
  origin: { type: String },
  referer: { type: String },
  host: { type: String },
  user: { type: String },
  fromPublisherId: { type: String },
  fromPublisherName: { type: String },
  toPublisherId: { type: String },
  toPublisherName: { type: String },
  missionId: { type: String },
  missionClientId: { type: String },
  missionDomain: { type: String },
  missionTitle: { type: String },
  missionPostalCode: { type: String },
  missionDepartmentName: { type: String },
  missionOrganizationId: { type: String },
  missionOrganizationName: { type: String },
  source: { type: String },
  sourceId: { type: String },
  sourceName: { type: String },
  tag: { type: String },
  type: { type: String },
  status: { type: String },
  createdAt: { type: Date },
});

const StatsModel = model<Stats>(MODELNAME, schema);
export default StatsModel;
