import { captureException } from "@/error";
const URL = "https://data.geopf.fr/geocodage/";

export interface SearchAddressesCsvOptions {
  columns?: string[];
}

const geopfService = {
  async searchAddressesCsv(csv: string, options?: SearchAddressesCsvOptions): Promise<string | null> {
    try {
      const formData = new FormData();
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("data", blob, "data.csv");

      if (options?.columns) {
        for (const col of options.columns) {
          formData.append("columns", col);
        }
      }

      const res = await fetch(`${URL}/search/csv`, {
        method: "POST",
        body: formData,
      });
      return await res.text();
    } catch (error) {
      captureException(error);
      return null;
    }
  },
};

export default geopfService;
