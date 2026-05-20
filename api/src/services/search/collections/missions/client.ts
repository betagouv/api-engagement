import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import type { SearchParams } from "typesense/lib/Typesense/Types";

import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import { searchProvider } from "@/services/search";

import type { MissionIndexDocument } from "./types";

export const missionSearchClient = {
  search(params: SearchParams<MissionIndexDocument>): Promise<SearchResponse<MissionIndexDocument>> {
    return searchProvider.search(TYPESENSE_MISSION_COLLECTION, params);
  },

  upsert(document: MissionIndexDocument): Promise<MissionIndexDocument> {
    return searchProvider.upsert(TYPESENSE_MISSION_COLLECTION, document);
  },

  delete(missionId: string): Promise<MissionIndexDocument> {
    return searchProvider.delete(TYPESENSE_MISSION_COLLECTION, missionId) as Promise<MissionIndexDocument>;
  },
};
