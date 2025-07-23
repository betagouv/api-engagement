import { Schema, model } from "mongoose";

import { Organization } from "../types";

const MODELNAME = "organization";

const schema = new Schema<Organization>(
  {
    esId: { type: String, description: "ES ID" },
    rna: { type: String, required: true, description: "RNA" },
    siren: { type: String, description: "Siren" },
    siret: { type: String, description: "Siret" },
    sirets: { type: [String], description: "Sirets" },
    rupMi: { type: String, description: "RUP/MI" },
    gestion: { type: String, description: "Gestion" },
    status: { type: String, description: "Status" },
    lastDeclaredAt: { type: Date, description: "Last declared at" },
    publishedAt: { type: Date, description: "Published at" },
    dissolvedAt: { type: Date, description: "Dissolved at" },
    nature: { type: String, description: "Nature" },
    groupement: { type: String, description: "Groupement" },
    title: { type: String, required: true, description: "Title" },
    names: { type: [String], description: "Names found when associated to the RNA" },
    shortTitle: { type: String, description: "Short title" },
    titleSlug: { type: String, description: "Title slug" },
    shortTitleSlug: { type: String, description: "Short title slug" },
    object: { type: String, description: "Object" },
    socialObject1: { type: String, description: "Social object 1" },
    socialObject2: { type: String, description: "Social object 2" },
    addressComplement: { type: String, description: "Address complement" },
    addressNumber: { type: String, description: "Address number" },
    addressRepetition: { type: String, description: "Address repetition" },
    addressType: { type: String, description: "Address type" },
    addressStreet: { type: String, description: "Address street" },
    addressDistribution: { type: String, description: "Address distribution" },
    addressInseeCode: { type: String, description: "Address insee code" },
    addressPostalCode: { type: String, description: "Address postal code" },
    addressDepartmentCode: { type: String, description: "Address department code" },
    addressDepartmentName: { type: String, description: "Address department name" },
    addressRegion: { type: String, description: "Address region" },
    addressCity: { type: String, description: "Address city" },
    managementDeclarant: { type: String, description: "Management declarant" },
    managementComplement: { type: String, description: "Management complement" },
    managementStreet: { type: String, description: "Management street" },
    managementDistribution: { type: String, description: "Management distribution" },
    managementPostalCode: { type: String, description: "Management postal code" },
    managementCity: { type: String, description: "Management city" },
    managementCountry: { type: String, description: "Management country" },
    directorCivility: { type: String, description: "Director civility" },
    website: { type: String, description: "Website" },
    observation: { type: String, description: "Observation" },
    syncAt: { type: Date, description: "Sync at" },
    source: { type: String, description: "Source" },

    // Letudiant
    letudiantPublicId: { type: String, description: "Letudiant public ID" },
    letudiantUpdatedAt: { type: Date, description: "Letudiant updated at" },
  },
  { timestamps: true }
);

schema.index({ rna: 1 });
schema.index({ title: 1 });
schema.index({ titleSlug: 1 });
schema.index({ siret: 1 });
schema.index({ addressDepartmentName: 1 });
schema.index({ addressCity: 1 });
schema.index({ title: "text", shortTitle: "text", rna: "text", siret: "text" });

const OrganizationModel = model<Organization>(MODELNAME, schema);
export default OrganizationModel;
