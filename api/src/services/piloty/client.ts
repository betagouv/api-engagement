import { PilotyCompany, PilotyCompanyPayload, PilotyJob, PilotyJobPayload } from "./types";

const BASE_URL = "https://api.piloty.fr";

export class PilotyClient {
  private token: string;

  constructor(token?: string) {
    this.token = token || "";
  }

  private getHeaders(): Record<string, string> {
    console.log(this.token);
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async createCompany(payload: PilotyCompanyPayload): Promise<PilotyCompany | null> {
    try {
      const res = await fetch(`${BASE_URL}/companies`, {
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
      const res = await fetch(`${BASE_URL}/companies/${publicId}`, {
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

  async createJob(payload: PilotyJobPayload): Promise<PilotyJob | null> {
    try {
      const res = await fetch(`${BASE_URL}/jobs`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return (await res.json()).data;
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
      const res = await fetch(`${BASE_URL}/jobs/${publicId}`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
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
      const res = await fetch(`${BASE_URL}/jobs/${publicId}`, {
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
}
