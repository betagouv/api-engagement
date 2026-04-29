import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import { typesenseClient } from "@/services/typesense/client";
import { IndexedTaxonomyKey } from "@/services/typesense/mission-fields";
import { ensureMissionCollection } from "@/services/typesense/schema";
import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import type { SearchParams } from "typesense/lib/Typesense/Types";

export type MissionIndexDocument = Partial<Record<IndexedTaxonomyKey, string[]>> & {
  id: string;
  publisherId: string;
  departmentCodes: string[];
};

const missionCollection = () => typesenseClient.collections<MissionIndexDocument>(TYPESENSE_MISSION_COLLECTION);

export const missionTypesenseClient = {
  async search(params: SearchParams<MissionIndexDocument>): Promise<SearchResponse<MissionIndexDocument>> {
    await ensureMissionCollection();
    return missionCollection().documents().search(params);
  },

  async upsert(document: MissionIndexDocument): Promise<MissionIndexDocument> {
    await ensureMissionCollection();
    return missionCollection().documents().upsert(document);
  },

  async delete(missionId: string): Promise<MissionIndexDocument> {
    await ensureMissionCollection();
    return missionCollection().documents(missionId).delete();
  },
};
