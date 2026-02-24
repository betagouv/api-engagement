import { PILOTY_BASE_URL } from "@/config";
import { PilotyError } from "@/services/piloty/exceptions";
import { PilotyCompany, PilotyCompanyField, PilotyCompanyPayload, PilotyJob, PilotyJobCategory, PilotyJobField, PilotyJobPayload } from "@/services/piloty/types";

/**
 * Piloty API wrapper
 * See documentation: https://developers.piloty.fr/
 *
 * NB:
 * - Token is expected for each environment.
 * - Media public ID is related to job board account ("letudiant").
 */

export class PilotyClient {
  private token: string;

  private mediaPublicId: string;

  private baseUrl: string;

  constructor(token: string, mediaPublicId: string) {
    this.token = token;
    this.mediaPublicId = mediaPublicId;
    this.baseUrl = PILOTY_BASE_URL;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T = any>(input: RequestInfo, init: RequestInit = {}, retries = 0): Promise<T> {
    const headers = { ...this.getHeaders(), ...(init.headers || {}) };
    const finalInit = { ...init, headers };
    let res: Response;
    try {
      res = await fetch(input, finalInit);
    } catch (err) {
      throw new PilotyError(`Network error: ${err}`, 0, null);
    }
    let body: any = null;
    try {
      body = await res.json();
    } catch (err) {
      // Ignore JSON parse error if body is empty
    }
    if (!res.ok) {
      if (res.status === 429) {
        if (retries < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return this.request<T>(input, init, retries + 1);
        } else {
          throw new PilotyError(`Rate limit exceeded after 3 retries`, 429, body);
        }
      } else {
        throw new PilotyError(`HTTP ${res.status} – ${body?.message || res.statusText}`, res.status, body);
      }
    }
    return body;
  }

  async createCompany(payload: PilotyCompanyPayload): Promise<PilotyCompany> {
    const body = await this.request<{ data: PilotyCompany }>(`${this.baseUrl}/companies`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return body.data;
  }

  async updateCompany(publicId: string, payload: PilotyCompanyPayload): Promise<PilotyCompany | null> {
    const body = await this.request<{ company?: PilotyCompany }>(`${this.baseUrl}/companies/${publicId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    // Warning: if no field is updated, Piloty does not return the company
    return body.company ?? null;
  }

  async getCompanyById(publicId: string): Promise<PilotyCompany | null> {
    const body = await this.request<{ data: PilotyCompany | null }>(`${this.baseUrl}/companies/${publicId}`, {
      method: "GET",
    });
    return body.data;
  }

  async findCompanyByName(name: string): Promise<PilotyCompany | null> {
    const url = new URL(`${this.baseUrl}/companies`);
    url.searchParams.set("search", name);
    url.searchParams.set("media-public-id", this.mediaPublicId);
    const body = await this.request<{ data: PilotyCompany[] }>(url.toString(), {
      method: "GET",
    });
    return body.data[0] || null;
  }

  async createJob(payload: PilotyJobPayload): Promise<PilotyJob> {
    const body = await this.request<{ data: PilotyJob[] }>(`${this.baseUrl}/jobs`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return body.data[0]; // Piloty returns an array of 1 element
  }

  async updateJob(publicId: string, payload: PilotyJobPayload): Promise<PilotyJob> {
    const body = await this.request<{ data: PilotyJob[] }>(`${this.baseUrl}/jobs/${publicId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return body.data[0];
  }

  async getJobById(publicId: string): Promise<PilotyJob | null> {
    const body = await this.request<{ data: PilotyJob | null }>(`${this.baseUrl}/jobs/${publicId}`, {
      method: "GET",
    });
    return body.data;
  }

  async getContracts(): Promise<PilotyJobField[] | null> {
    const body = await this.request<{ data: PilotyJobField[] | null }>(`${this.baseUrl}/contracts`, {
      method: "GET",
    });
    return body.data;
  }

  async getRemotePolicies(): Promise<PilotyJobField[] | null> {
    const body = await this.request<{ data: PilotyJobField[] | null }>(`${this.baseUrl}/remote_policies`, {
      method: "GET",
    });
    return body.data;
  }

  async getJobCategories(): Promise<PilotyJobCategory[] | null> {
    const body = await this.request<{ data: PilotyJobCategory[] | null }>(`${this.baseUrl}/job_categories`, {
      method: "GET",
    });
    return body.data;
  }

  async getCompanySectors(): Promise<PilotyCompanyField[] | null> {
    const body = await this.request<{ data: PilotyCompanyField[] | null }>(`${this.baseUrl}/company_sectors`, {
      method: "GET",
    });
    return body.data;
  }
}
