/**
 * Interface représentant une adresse
 */
export interface Address {
  street?: string;
  postalCode?: string;
  departmentName?: string;
  departmentCode?: string;
  city?: string;
  region?: string;
  country?: string;
  location?: {
    lat?: number;
    lon?: number;
  };
  geoPoint?: {
    type: string;
    coordinates: number[];
  };
  geolocStatus?: string;
}
