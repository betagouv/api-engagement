import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import { searchProvider } from "@/services/search";
import type { SearchQueryParams, SearchQueryResponse } from "@/services/search/types";

import type { MissionIndexDocument } from "./types";

export const missionSearchClient = {
  search(params: SearchQueryParams<MissionIndexDocument>): Promise<SearchQueryResponse<MissionIndexDocument>> {
    return searchProvider.search(TYPESENSE_MISSION_COLLECTION, params);
  },

  upsert(document: MissionIndexDocument): Promise<MissionIndexDocument> {
    return searchProvider.upsert(TYPESENSE_MISSION_COLLECTION, document);
  },

  delete(missionId: string): Promise<MissionIndexDocument> {
    return searchProvider.delete(TYPESENSE_MISSION_COLLECTION, missionId) as Promise<MissionIndexDocument>;
  },
};
