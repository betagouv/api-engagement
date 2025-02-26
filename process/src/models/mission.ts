import { Schema, model } from "mongoose";

import { Mission } from "../types";

const MODELNAME = "mission";

const geoPointSchema = new Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number],
  },
});

const addressesSchema = new Schema({
  street: { type: String },
  city: { type: String },
  postalCode: { type: String },
  departmentName: { type: String },
  departmentCode: { type: String },
  region: { type: String },
  country: { type: String },
  location: {
    lat: { type: Number },
    lon: { type: Number },
  },
  geoPoint: { type: geoPointSchema, default: null },
  geolocStatus: { type: String, enum: ["ENRICHED_BY_PUBLISHER", "ENRICHED", "NOT_FOUND", "NO_DATA", "SHOULD_ENRICH", "FAILED"], default: "NO_DATA" },
});

const schema = new Schema<Mission>(
  {
    // Identifiers
    _old_id: { type: String },
    _old_ids: { type: [String] },

    // Mission
    clientId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    descriptionHtml: { type: String },
    tags: { type: [String] },
    tasks: { type: [String] },
    audience: { type: [String] },
    soft_skills: { type: [String] },
    reducedMobilityAccessible: { type: String, enum: ["yes", "no"], default: "no" },
    closeToTransport: { type: String, enum: ["yes", "no"], default: "no" },
    openToMinors: { type: String, enum: ["yes", "no"], default: "no" },
    remote: { type: String, enum: ["no", "possible", "full"], default: "no" },
    schedule: { type: String },
    duration: { type: Number },
    postedAt: { type: Date, default: Date.now },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date },
    priority: { type: String },
    places: { type: Number },
    placesStatus: { type: String, enum: ["ATTRIBUTED_BY_API", "GIVEN_BY_PARTNER"], default: "ATTRIBUTED_BY_API" },
    metadata: { type: String },
    domain: { type: String },
    domainOriginal: { type: String },
    domainLogo: { type: String },
    activity: { type: String },
    type: { type: String },
    snu: { type: Boolean },
    snuPlaces: { type: Number },

    // Address
    adresse: { type: String }, // Misspelled in the doc but used in the code
    address: { type: String },
    postalCode: { type: String },
    departmentName: { type: String },
    departmentCode: { type: String },
    city: { type: String },
    region: { type: String },
    country: { type: String },
    location: {
      lat: { type: Number },
      lon: { type: Number },
    },
    geoPoint: { type: geoPointSchema, default: null },
    geolocStatus: { type: String, enum: ["ENRICHED_BY_PUBLISHER", "ENRICHED", "NOT_FOUND", "NO_DATA", "SHOULD_ENRICH", "FAILED"], default: "NO_DATA" },
    addresses: { type: [addressesSchema], default: [] },

    // Organisation
    organizationUrl: { type: String },
    organizationName: { type: String },
    organizationType: { type: String },
    organizationLogo: { type: String },
    organizationDescription: { type: String },
    organizationClientId: { type: String },
    organizationFullAddress: { type: String },
    organizationRNA: { type: String },
    organizationSiren: { type: String },
    organizationDepartment: { type: String },
    organizationPostCode: { type: String },
    organizationCity: { type: String },
    organizationStatusJuridique: { type: String },
    organizationBeneficiaries: { type: [String] },
    organizationActions: { type: [String] },
    organizationReseaux: { type: [String] },

    // Organization verification

    organizationVerificationStatus: { type: String },
    organizationId: { type: String },
    organisationIsRUP: { type: Boolean },
    organizationNameVerified: { type: String },
    organizationRNAVerified: { type: String },
    organizationSirenVerified: { type: String },
    organizationSiretVerified: { type: String },
    organizationAddressVerified: { type: String },
    organizationCityVerified: { type: String },
    organizationPostalCodeVerified: { type: String },
    organizationDepartmentCodeVerified: { type: String },
    organizationDepartmentNameVerified: { type: String },
    organizationRegionVerified: { type: String },

    // Publisher (added by the API)
    publisherId: { type: String, required: true },
    publisherName: { type: String, required: true },
    publisherUrl: { type: String },
    publisherLogo: { type: String },
    lastSyncAt: { type: Date, required: true },
    applicationUrl: { type: String },
    statusCode: { type: String, required: true, enum: ["ACCEPTED", "REFUSED"], default: "ACCEPTED" },
    statusComment: { type: String },
    statusCommentHistoric: {
      type: [
        {
          status: { type: String },
          comment: { type: String },
          date: { type: Date },
        },
      ],
    },

    // Association (added by the API)
    associationId: { type: String },
    associationName: { type: String },
    associationSiren: { type: String },
    associationSiret: { type: String },
    associationRNA: { type: String },
    associationSources: { type: [String] },
    associationReseaux: { type: [String] },
    associationLogo: { type: String },
    associationAddress: { type: String },
    associationCity: { type: String },
    associationPostalCode: { type: String },
    associationDepartmentCode: { type: String },
    associationDepartmentName: { type: String },
    associationRegion: { type: String },

    // Metadata
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    // Moderation JVA
    moderation_5f5931496c7ea514150a818f_status: { type: String, enum: ["PENDING", "ONGOING", "ACCEPTED", "REFUSED"], default: "PENDING" },
    moderation_5f5931496c7ea514150a818f_comment: { type: String },
    moderation_5f5931496c7ea514150a818f_note: { type: String },
    moderation_5f5931496c7ea514150a818f_title: { type: String },
    moderation_5f5931496c7ea514150a818f_date: { type: Date },

    // LeBonCoin
    leboncoinStatus: { type: String },
    leboncoinUrl: { type: String },
    leboncoinComment: { type: String },
    leboncoinUpdatedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

const MissionModel = model<Mission>(MODELNAME, schema);
export default MissionModel;
