export interface LinkedInJob {
  partnerJobId: string;
  company: string;
  title: string;
  description: string;
  applyUrl: string;
  companyId: string;
  location: string;
  lastBuildDate?: string;
  publisherURL?: string;
  publisher?: string;
  expectedJobCount?: number;
  alternateLocations?: string[];
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  workplaceTypes?: "On-site" | "Hybrid" | "Remote";
  industryCodes?: {
    industryCode: string;
  }[];
  industryCode?: string;
  experienceLevel?: string;
  jobFunctions?: string[];
  jobFunction?: string;
  jobtype?: string;
  Skills?: string[];
  salaries?: string[];
  highEnd?: number;
  lowEnd?: number;
  currencyCode?: string;
  period?: string;
  type?: string;
  listDate?: string;
  expirationDate?: string;
}
