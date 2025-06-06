// Payload to create/update a company
// https://developers.piloty.fr/companies-api/companies/post-create-company
export interface PilotyCompanyPayload {
  media_public_id: string;
  name: string;
  domain_url?: string;
  sector_id?: string;
  size_id?: string;
  description?: string;
  logo?: string;
  logo_url?: string;
}

// Company response from API
// https://developers.piloty.fr/companies-api/companies/get-retrieve-company
export interface PilotyCompany {
  id: string;
  name: string;
  public_id: string;
  size: string;
  sectors: string[];
  content: {
    visual: {
      logo: string;
    };
    description: string;
    language: string;
  };
  is_published: boolean;
  is_vme_page_published: boolean;
}

// Payload to create/update a job
// https://developers.piloty.fr/jobs-api/jobs/post-create-job
export interface PilotyJobPayload {
  media_public_id: string;
  company_public_id: string;
  name: string;
  contract_id: string;
  job_category_id: string;
  localisation: string;
  description_job: string;
  application_method: "external_apply" | "internal_apply";
  application_url: string;
  state?: "draft" | "published" | "archived";
  worktime_id?: string;
  remote_policy_id?: string;
  education_id?: string;
  experience_id?: string;
  salary?: string;
  position_level?: "employee" | "executive";
  description_company?: string;
  description_profile?: string;
  description_benefits?: string;
  description_process?: string;
  manager_emails?: string;
  recruiter_emails?: string;
}

// Job response from API
// https://developers.piloty.fr/jobs-api/jobs/get-retrieve-job
export interface PilotyJob {
  name: string;
  public_id: string;
  company: {
    public_id: string;
    name: string;
  };
  worktime: {
    public_id: string;
    name: string;
  };
  remote: {
    public_id: string;
    name: string;
  };
  education: {
    public_id: string;
    name: string;
  };
  experience: {
    public_id: string;
    name: string;
  };
  contract: {
    public_id: string;
    name: string;
  };
  office: {
    public_id: string;
    name: string;
  };
  location: {
    address_nbr: string | null;
    address: string | null;
    city: string;
    administrative_area_department: string;
    administrative_area_region: string;
    zip_code: string;
    country: string;
    country_code: string;
  };
  salary: string;
  description: {
    company_desc: string;
    job_desc: string;
    profile_desc: string;
    benefit_desc: string;
    process_desc: string;
  };
  questions: { [key: string]: string }[];
  job_url: string;
  apply_url: string;
  publishedAt: string;
  is_redirect_apply: boolean;
}

// All fields related to job
// Used for contract, remote policy
// https://developers.piloty.fr/jobs-api/jobs-fields/get-list-contracts
// https://developers.piloty.fr/jobs-api/jobs-fields/get-list-remote-policies
export interface PilotyJobField {
  id: string;
  name: string;
  ref: string;
}

export interface PilotyJobCategory {
  id: string;
  parent_id: string;
  ref: string;
  children: {
    data: PilotyJobCategory[];
  };
}

// All fields related to company
// Used for sector
// https://developers.piloty.fr/jobs-api/jobs-fields/get-list-company-sectors
export interface PilotyCompanyField {
  id: string;
  ref: string;
}

// Mandatory data fetched from Piloty API once
export interface PilotyMandatoryData {
  contracts: {
    benevolat: string;
    volontariat: string;
  };
  remotePolicies: {
    full: string;
  };
  jobCategories: Record<string, string>;
}
