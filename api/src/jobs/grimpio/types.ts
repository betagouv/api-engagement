export interface GrimpioLocation {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

export interface GrimpioJob {
  title: string;
  url: string;
  contractType: string;
  enterpriseName: string;
  description: string;
  enterpriseIndustry: string;
  externalId: string;
  location: GrimpioLocation;
  logo: string;
  remoteJob: "none" | "total" | "partial";
  annualGrossSalary: string;
  duration: string;
  attachment: string;
  levels: string;
  email: string;
  startingDate: string;
}
