import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { searchProvider } from "@/services/search";
import missionSchemaV1 from "@/services/search/collections/missions/schemas/v1";

const LOG_PREFIX = "[setup-search-collections-job]";

// Manifest des collections à initialiser.
// Pour ajouter une collection : importer son dernier schéma et l'ajouter ici.
const SCHEMAS = [missionSchemaV1];

export interface SetupSearchCollectionsJobResult extends JobResult {
  collections: string[];
}

export class SetupSearchCollectionsHandler implements BaseHandler<Record<string, never>, SetupSearchCollectionsJobResult> {
  name = "Initialisation des collections de recherche";

  async handle(): Promise<SetupSearchCollectionsJobResult> {
    const ensured: string[] = [];

    for (const schema of SCHEMAS) {
      console.log(`${LOG_PREFIX} ensuring collection: ${schema.name}`);
      await searchProvider.ensure(schema);
      ensured.push(schema.name);
      console.log(`${LOG_PREFIX} done: ${schema.name}`);
    }

    const message = `${ensured.length} collection(s) initialisée(s) : ${ensured.join(", ")}`;
    console.log(`${LOG_PREFIX} ${message}`);

    return { success: true, timestamp: new Date(), message, collections: ensured };
  }
}
