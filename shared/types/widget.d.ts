/**
 * Interface représentant un widget d'affichage de missions
 */
export interface Widget {
  _id?: string;
  name: string;
  color?: string;
  style?: "carousel" | "page";
  type?: "benevolat" | "volontariat";
  location?: {
    lat?: number;
    lon?: number;
    city?: string;
    label?: string;
    postcode?: string;
    name?: string;
  } | null;
  distance?: string;
  rules?: {
    field: string;
    fieldType?: string;
    operator: string;
    value: string;
    combinator: "and" | "or";
  }[];
  publishers?: string[];
  jvaModeration?: boolean;
  display?: "full" | "line";
  url?: string;
  fromPublisherId: string;
  fromPublisherName?: string;
  active?: boolean;
  deleted?: boolean;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}
