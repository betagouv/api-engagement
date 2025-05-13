import { Schema, model } from "mongoose";

import { Widget } from "../types";

const MODELNAME = "widget";
const schema = new Schema<Widget>(
  {
    name: { type: String, required: true },
    color: { type: String, default: "#000091" },
    style: { type: String, enum: ["carousel", "page"], default: "page" },
    type: { type: String, enum: ["benevolat", "volontariat"], default: "benevolat" },
    location: {
      type: {
        lat: { type: Number },
        lon: { type: Number },
        city: { type: String },
        label: { type: String },
        postcode: { type: String },
        name: { type: String },
      },
      default: null,
    },
    distance: { type: String, default: "25km" },
    rules: {
      type: [
        {
          field: { type: String, required: true },
          fieldType: { type: String, default: "text" },
          operator: { type: String, required: true },
          value: { type: String, required: true },
          combinator: { type: String, required: true, enum: ["and", "or"] },
        },
      ],
      default: [],
    },
    publishers: {
      type: [String],
      description: "List of publishers ids where the widget will take the mission from",
    },
    jvaModeration: {
      type: Boolean,
      default: false,
      description: "Boolean that says if the mission of the widget should be the ones moderated by JVA",
    },

    url: { type: String },
    fromPublisherId: { type: String, required: true },
    fromPublisherName: { type: String },
    active: { type: Boolean, required: true, default: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const WidgetModel = model<Widget>(MODELNAME, schema);
export default WidgetModel;
