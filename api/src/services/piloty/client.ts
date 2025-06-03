import { PILOTY_BASE_URL } from "../../config";
import { PilotyCompany, PilotyCompanyPayload, PilotyJob, PilotyJobCategory, PilotyJobField, PilotyJobPayload } from "./types";

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

  async createCompany(payload: PilotyCompanyPayload): Promise<PilotyCompany | null> {
    try {
      const res = await fetch(`${this.baseUrl}/companies`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return (await res.json()).data;
      }

      console.error("Piloty createCompany error", await res.text());
      return null;
    } catch (error) {
      console.error("Piloty createCompany error", error);
      return null;
    }
  }

  async getCompanyById(publicId: string): Promise<PilotyCompany | null> {
    try {
      const res = await fetch(`${this.baseUrl}/companies/${publicId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return (await res.json()).data;
      }
      return null;
    } catch (error) {
      console.error("Piloty getCompanyById error", error);
      return null;
    }
  }

  async findCompanyByName(name: string): Promise<PilotyCompany | null> {
    try {
      const url = new URL(`${this.baseUrl}/companies`);
      url.searchParams.set("search", name);
      url.searchParams.set("media-public-id", this.mediaPublicId);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data[0] || null;
      }
      return null;
    } catch (error) {
      console.error("Piloty findCompanyByName error", error);
      return null;
    }
  }

  async createJob(payload: PilotyJobPayload): Promise<PilotyJob | null> {
    try {
      const res = await fetch(`${this.baseUrl}/jobs`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data[0]; // Piloty returns an array of 1 element
      }

      console.error("Piloty createJob error", await res.text());
      return null;
    } catch (error) {
      console.error("Piloty createJob error", error);
      return null;
    }
  }

  async updateJob(publicId: string, payload: PilotyJobPayload): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/jobs/${publicId}`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data[0]; // Piloty returns an array of 1 element
      }
      console.error("Piloty updateJob error", await res.text());
      return null;
    } catch (error) {
      console.error("Piloty updateJob error", error);
      return null;
    }
  }

  async getJobById(publicId: string): Promise<PilotyJob | null> {
    try {
      const res = await fetch(`${this.baseUrl}/jobs/${publicId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return (await res.json()).data;
      }
      return null;
    } catch (error) {
      console.error("Piloty getJobById error", error);
      return null;
    }
  }

  async getContracts(): Promise<PilotyJobField[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/contracts`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return (await res.json()).data;
      }
      return null;
    } catch (error) {
      console.error("Piloty getContracts error", error);
      return null;
    }
  }

  async getRemotePolicies(): Promise<PilotyJobField[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/remote_policies`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return (await res.json()).data;
      }
      return null;
    } catch (error) {
      console.error("Piloty getRemotePolicies error", error);
      return null;
    }
  }

  async getJobCategories(): Promise<PilotyJobCategory[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/job_categories`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return (await res.json()).data;
      }
      return null;
    } catch (error) {
      console.error("Piloty getJobCategories error", error);
      return null;
    }
  }
}
