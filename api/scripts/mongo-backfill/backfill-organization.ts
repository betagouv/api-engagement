import mongoose from "mongoose";

import type { OrganizationCreateInput } from "../../src/types/organization";
import { asBoolean, asDate, asString, asStringArray, toMongoObjectIdString } from "./utils/cast";
import { loadEnvironment, parseScriptOptions, type ScriptOptions } from "./utils/options";

type MongoOrganizationDocument = {
  _id?: { toString(): string } | string;
  rna?: unknown;
  siren?: unknown;
  siret?: unknown;
  sirets?: unknown;
  rupMi?: unknown;
  gestion?: unknown;
  status?: unknown;
  createdAt?: unknown;
  lastDeclaredAt?: unknown;
  publishedAt?: unknown;
  dissolvedAt?: unknown;
  updatedAt?: unknown;
  nature?: unknown;
  groupement?: unknown;
  title?: unknown;
  names?: unknown;
  shortTitle?: unknown;
  titleSlug?: unknown;
  shortTitleSlug?: unknown;
  object?: unknown;
  socialObject1?: unknown;
  socialObject2?: unknown;
  addressComplement?: unknown;
  addressNumber?: unknown;
  addressRepetition?: unknown;
  addressType?: unknown;
  addressStreet?: unknown;
  addressDistribution?: unknown;
  addressInseeCode?: unknown;
  addressPostalCode?: unknown;
  addressDepartmentCode?: unknown;
  addressDepartmentName?: unknown;
  addressRegion?: unknown;
  addressCity?: unknown;
  managementDeclarant?: unknown;
  managementComplement?: unknown;
  managementStreet?: unknown;
  managementDistribution?: unknown;
  managementPostalCode?: unknown;
  managementCity?: unknown;
  managementCountry?: unknown;
  directorCivility?: unknown;
  website?: unknown;
  observation?: unknown;
  syncAt?: unknown;
  source?: unknown;
  isRUP?: unknown;
  letudiantPublicId?: unknown;
  letudiantUpdatedAt?: unknown;
  lastExportedToPgAt?: unknown;
};

const BATCH_SIZE = 500;
const options: ScriptOptions = parseScriptOptions(process.argv.slice(2), "MigrateOrganizations");
loadEnvironment(options, __dirname, "MigrateOrganizations");

const ensureSirets = (doc: MongoOrganizationDocument, fallbackSiret: string | null): string[] => {
  const sirets = asStringArray(doc.sirets);
  if (fallbackSiret && !sirets.includes(fallbackSiret)) {
    sirets.push(fallbackSiret);
  }
  return sirets;
};

const normalizeOrganization = (doc: MongoOrganizationDocument): OrganizationCreateInput => {
  const id = toMongoObjectIdString(doc._id);
  if (!id) {
    throw new Error("[MigrateOrganizations] Encountered organization document without a valid Mongo ObjectId");
  }

  const title = asString(doc.title) ?? asString(doc.shortTitle) ?? asString(doc.rna) ?? id;
  if (!title) {
    throw new Error(`[MigrateOrganizations] Organization ${id} does not have a valid title`);
  }

  const createdAt = asDate(doc.createdAt) ?? new Date();
  const updatedAt = asDate(doc.updatedAt) ?? createdAt;
  const siret = asString(doc.siret);

  return {
    id,
    rna: asString(doc.rna),
    siren: asString(doc.siren),
    siret,
    sirets: ensureSirets(doc, siret),
    rupMi: asString(doc.rupMi),
    gestion: asString(doc.gestion),
    status: asString(doc.status),
    createdAt,
    updatedAt,
    lastDeclaredAt: asDate(doc.lastDeclaredAt),
    publishedAt: asDate(doc.publishedAt),
    dissolvedAt: asDate(doc.dissolvedAt),
    nature: asString(doc.nature),
    groupement: asString(doc.groupement),
    title,
    names: asStringArray(doc.names),
    shortTitle: asString(doc.shortTitle),
    titleSlug: asString(doc.titleSlug),
    shortTitleSlug: asString(doc.shortTitleSlug),
    object: asString(doc.object),
    socialObject1: asString(doc.socialObject1),
    socialObject2: asString(doc.socialObject2),
    addressComplement: asString(doc.addressComplement),
    addressNumber: asString(doc.addressNumber),
    addressRepetition: asString(doc.addressRepetition),
    addressType: asString(doc.addressType),
    addressStreet: asString(doc.addressStreet),
    addressDistribution: asString(doc.addressDistribution),
    addressInseeCode: asString(doc.addressInseeCode),
    addressPostalCode: asString(doc.addressPostalCode),
    addressDepartmentCode: asString(doc.addressDepartmentCode),
    addressDepartmentName: asString(doc.addressDepartmentName),
    addressRegion: asString(doc.addressRegion),
    addressCity: asString(doc.addressCity),
    managementDeclarant: asString(doc.managementDeclarant),
    managementComplement: asString(doc.managementComplement),
    managementStreet: asString(doc.managementStreet),
    managementDistribution: asString(doc.managementDistribution),
    managementPostalCode: asString(doc.managementPostalCode),
    managementCity: asString(doc.managementCity),
    managementCountry: asString(doc.managementCountry),
    directorCivility: asString(doc.directorCivility),
    website: asString(doc.website),
    observation: asString(doc.observation),
    syncAt: asDate(doc.syncAt),
    source: asString(doc.source),
    isRUP: asBoolean(doc.isRUP, false),
    letudiantPublicId: asString(doc.letudiantPublicId),
    letudiantUpdatedAt: asDate(doc.letudiantUpdatedAt),
    lastExportedToPgAt: asDate(doc.lastExportedToPgAt),
  };
};

const migrateOrganizations = async () => {
  const [{ mongoConnected }, { pgConnected, prismaCore }, { organizationService }] = await Promise.all([
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/services/organization"),
  ]);

  await mongoConnected;
  await pgConnected;

  console.log("[MigrateOrganizations] Starting migration");

  const collection = mongoose.connection.collection("organizations");
  const total = await collection.countDocuments();
  console.log(`[MigrateOrganizations] Found ${total} organization document(s) in MongoDB`);

  const cursor = collection.find({}, { batchSize: BATCH_SIZE }).sort({ _id: 1 });

  let processed = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as MongoOrganizationDocument;
    if (!doc) {
      continue;
    }

    try {
      const normalized = normalizeOrganization(doc);
      if (options.dryRun) {
        console.log(`[MigrateOrganizations][Dry-run] Would upsert organization ${normalized.id} (${normalized.title})`);
      } else if (normalized.id) {
        const existing = await organizationService.findOneOrganizationById(normalized.id);
        if (!existing) {
          await organizationService.createOrganization(normalized);
          created++;
        } else {
          const { id, ...patch } = normalized;
          await organizationService.updateOrganization(id, patch);
          updated++;
        }
      } else {
        throw new Error("Missing organization ID");
      }
      processed++;

      if (processed % BATCH_SIZE === 0) {
        console.log(`[MigrateOrganizations] Processed ${processed}/${total} (created: ${created}, updated: ${updated}, errors: ${errors}, dry-run: ${options.dryRun})`);
      }
    } catch (error) {
      errors++;
      console.error("[MigrateOrganizations] Failed to migrate organization document", error);
    }
  }

  console.log(`[MigrateOrganizations] Completed. Processed: ${processed}, created: ${created}, updated: ${updated}, errors: ${errors}, dry-run: ${options.dryRun}`);

  await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
};

migrateOrganizations()
  .then(() => {
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[MigrateOrganizations] Unexpected error:", error);
    try {
      const { prismaCore } = await import("../../src/db/postgres");
      await Promise.allSettled([mongoose.connection.close(), prismaCore.$disconnect()]);
    } catch {
      await Promise.allSettled([mongoose.connection.close()]);
    }
    process.exit(1);
  });
