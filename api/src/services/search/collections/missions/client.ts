import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import { searchProvider } from "@/services/search";
import type { SearchQueryParams, SearchQueryResponse } from "@/services/search/types";

import type { MissionIndexDocument } from "./types";

export const missionSearchClient = {
  search(params: SearchQueryParams<MissionIndexDocument>): Promise<SearchQueryResponse<MissionIndexDocument>> {
    return searchProvider.search(TYPESENSE_MISSION_COLLECTION, params);
  },

  multiSearch(searches: SearchQueryParams<MissionIndexDocument>[]): Promise<SearchQueryResponse<MissionIndexDocument>[]> {
    return searchProvider.multiSearch(TYPESENSE_MISSION_COLLECTION, searches);
  },

  // Ids des `limit` missions les plus récentes pour chaque filtre, en un seul aller-retour.
  async findLatestIds(filters: Array<string | undefined>, limit: number): Promise<string[][]> {
    const searches = filters.map((filter) => ({ q: "*", query_by: "publisherId", filter_by: filter, sort_by: "createdAt:desc", per_page: limit }));
    const results = await searchProvider.multiSearch<MissionIndexDocument>(TYPESENSE_MISSION_COLLECTION, searches);
    return results.map((result) => (result.hits ?? []).map((hit) => hit.document.id));
  },

  upsert(document: MissionIndexDocument): Promise<MissionIndexDocument> {
    return searchProvider.upsert(TYPESENSE_MISSION_COLLECTION, document);
  },

  delete(missionId: string): Promise<MissionIndexDocument> {
    return searchProvider.delete(TYPESENSE_MISSION_COLLECTION, missionId) as Promise<MissionIndexDocument>;
  },

  retrieve(missionId: string): Promise<MissionIndexDocument | null> {
    return searchProvider.retrieve<MissionIndexDocument>(TYPESENSE_MISSION_COLLECTION, missionId);
  },
};
