export interface Location {
  label: string;
  value: string;
  lat: number;
  lon: number;
  city: string;
  postcode: string;
  name?: string;
}

export interface FilterOption {
  label: string;
  value: string | number;
  count?: number;
}

export interface Widget {
  id: string;
  type: "benevolat" | "volontariat";
  style: "carousel" | "grid" | "page";
  color?: string;
  location?: Location | null;
  fromPublisherId?: string | number;
}

export interface Mission {
  _id: string;
  url: string;
  title: string;
  domain: string;
  domainLogo?: string;
  organizationName: string;
  city: string;
  country: string;
  remote?: string;
  places?: number;
  tags?: string[];
  addresses?: Address[];
  [key: string]: any;
}

export interface Address {
  city: string;
  location?: {
    lat: number;
    lon: number;
  };
  [key: string]: any;
}

export interface Filters {
  domain: FilterOption[];
  location: Location | null;
  page: number;
  size: number;
  // Benevolat specific filters
  organization?: FilterOption[];
  department?: FilterOption[];
  remote?: FilterOption | null;
  // Volontariat specific filters
  start?: { label: string; value: Date } | null;
  duration?: FilterOption | null;
  schedule?: FilterOption | null;
  minor?: FilterOption | null;
  accessibility?: FilterOption | null;
  action?: FilterOption[];
  beneficiary?: FilterOption[];
  country?: FilterOption[];
}

export interface PageProps {
  widget: Widget | null;
  apiUrl: string;
  environment: string;
}

export interface ServerSideContext {
  query: {
    widgetName?: string;
    widget?: string;
    domain?: string;
    organization?: string;
    department?: string;
    remote?: string;
    schedule?: string;
    accessibility?: string;
    minor?: string;
    action?: string;
    beneficiary?: string;
    country?: string;
    start?: string;
    duration?: string;
    size?: string;
    from?: string;
    lat?: string;
    lon?: string;
    city?: string;
    notrack?: string;
  };
  req?: {
    headers?: {
      host?: string;
      "x-request-id"?: string;
      [key: string]: string | undefined;
    };
  };
}

export interface StoreState {
  url: string | null;
  color: string;
  mobile: boolean;
  setUrl: (url: string) => void;
  setColor: (color: string) => void;
  setMobile: (mobile: boolean) => void;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  ok: boolean;
  data: T;
}

export interface AggregationBucket {
  key: string;
  doc_count: number;
}

export interface AggregationData {
  domain: AggregationBucket[];
  organization: AggregationBucket[];
  department: AggregationBucket[];
  remote: AggregationBucket[];
  accessibility: AggregationBucket[];
  action: AggregationBucket[];
  beneficiary: AggregationBucket[];
  country: AggregationBucket[];
  minor: AggregationBucket[];
  schedule: AggregationBucket[];
}

export interface FilterOptions {
  organizations?: FilterOption[];
  domains?: FilterOption[];
  departments?: FilterOption[];
  remote?: FilterOption[];
  accessibility?: FilterOption[];
  action?: FilterOption[];
  beneficiary?: FilterOption[];
  country?: FilterOption[];
  domain?: FilterOption[];
  minor?: FilterOption[];
  schedule?: FilterOption[];
}
