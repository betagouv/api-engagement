import { captureException } from "../error";

const csv = async (csv: string) => {
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

export default { csv };
