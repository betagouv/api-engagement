import { captureException } from "../error";

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

export default { get };
