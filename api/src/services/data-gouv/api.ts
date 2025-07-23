import { captureException } from "../../error";

const get = async <T>(path: string) => {
  try {
    const response = await fetch(`https://www.data.gouv.fr/api/2${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const res = await response.json();
    return res.data as T;
  } catch (error) {
    captureException(error);
    return null;
  }
};

export const getAddressCsv = async (csv: string) => {
  try {
    const formData = new FormData();
    // transform csv string to blob
    const blob = new Blob([csv], { type: "text/csv" });
    formData.append("data", blob, "data.csv");
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/csv`, {
      method: "POST",
      body: formData,
    });
    return await res.text();
  } catch (error) {
    captureException(error);
    return null;
  }
};

export default { get, getAddressCsv };
