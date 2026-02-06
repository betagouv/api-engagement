import { captureException } from "../error";
const URL = "https://data.geopf.fr/geocodage/";

const geopfService = {
  async searchAddressesCsv(csv: string): Promise<string | null> {
    try {
      const formData = new FormData();
      // transform csv string to blob
      const blob = new Blob([csv], { type: "text/csv" });
      formData.append("data", blob, "data.csv");
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
