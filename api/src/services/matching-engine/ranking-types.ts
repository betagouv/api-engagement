/** Forme brute renvoyée par la requête de classement PostgreSQL. */
export type DbRankRow = {
  mission_id: string;
  mission_scoring_id: string;
  total_score: number;
  taxonomy_score: number;
  geo_score: number | null;
  distance_km: number | null;
  closest_lat: number | null;
  closest_lon: number | null;
  closest_address_id: string | null;
  closest_city: string | null;
  closest_address: string | null;
  total_count: number | bigint;
};
