// Structure d'une offre leboncoin = contenu d'un élément <job> du flux.
// Envelope : <source> → n × <job>. Les champs "job.*" de la spec sont des enfants
// directs de <job> ; application / company / applicant / pictures sont des sous-blocs.

export interface LeboncoinLocation {
  street?: string;
  zip_code: string;
  city: string;
  country?: string;
}

export interface LeboncoinContractDuration {
  min: number;
  max: number;
  duration_type: string;
}

export interface LeboncoinSalary {
  min?: number;
  max?: number;
  per?: string;
}

export interface LeboncoinCompany {
  name?: string;
  description?: string;
  url?: string;
  location?: LeboncoinLocation;
}

export interface LeboncoinApplicant {
  profile?: string;
  skills?: string;
  degree: number;
  experience: number;
}

export interface LeboncoinOffer {
  user_id: string;
  partner_unique_reference: string;
  client_reference?: string;
  title: string;
  description: string;
  start_date?: string;
  time_type: number;
  contract_type: number;
  business_sector?: number;
  occupation?: number;
  contract_duration?: LeboncoinContractDuration;
  location?: LeboncoinLocation;
  salary?: LeboncoinSalary;
  application: { mode: string; contact: string };
  company?: LeboncoinCompany;
  applicant?: LeboncoinApplicant;
  pictures?: { picture: string[] };
}
