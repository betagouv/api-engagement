import { PILOTY_BASE_URL } from "../../config";
import { PilotyCompany, PilotyCompanyField, PilotyCompanyPayload, PilotyJob, PilotyJobCategory, PilotyJobField, PilotyJobPayload } from "./types";

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

      throw new Error(`Piloty createCompany error: ${await res.text()}`);
    } catch (error) {
      console.error("Piloty createCompany error", error);
      throw error;
    }
  }

  async updateCompany(publicId: string, payload: PilotyCompanyPayload): Promise<PilotyCompany | null> {
    try {
      const res = await fetch(`${this.baseUrl}/companies/${publicId}`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        return data.company; // Warning: if no field is updated, Piloty do not returns the company
      }
      throw new Error(`Piloty updateCompany error: ${await res.text()}`);
    } catch (error) {
      console.error("Piloty updateCompany error", error);
      throw error;
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
      throw error;
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
      throw error;
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

      throw new Error(`Piloty createJob error: ${await res.text()}`);
    } catch (error) {
      console.error("Piloty createJob error", error);
      throw error;
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
      throw new Error(`Piloty updateJob error: ${await res.text()}`);
    } catch (error) {
      console.error("Piloty updateJob error", error);
      throw error;
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
      throw new Error(`Piloty getJobById error: ${await res.text()}`);
    } catch (error) {
      console.error("Piloty getJobById error", error);
      throw error;
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
      throw new Error(`Piloty getContracts error: ${await res.text()}`);
    } catch (error) {
      console.error("Piloty getContracts error", error);
      throw error;
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
      throw new Error(`Piloty getRemotePolicies error: ${await res.text()}`);
    } catch (error) {
      console.error("Piloty getRemotePolicies error", error);
      throw error;
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
      throw new Error(`Piloty getJobCategories error: ${await res.text()}`);
    } catch (error) {
      console.error("Piloty getJobCategories error", error);
      throw error;
    }
  }

  async getCompanySectors(): Promise<PilotyCompanyField[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/company_sectors`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return (await res.json()).data;
      }
      throw new Error(`Piloty getCompanySectors error: ${await res.text()}`);
    } catch (error) {
      console.error("Piloty getCompanySectors error", error);
      throw error;
    }
  }
}
