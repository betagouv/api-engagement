import { DATA_SUBVENTION_TOKEN } from "../config";
import { captureException } from "../error";

const get = async (path: string, body?: BodyInit, options?: RequestInit) => {
  try {
    const response = await fetch(`https://api.datasubvention.beta.gouv.fr${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": DATA_SUBVENTION_TOKEN,
      },
      body: JSON.stringify(body),
      ...options,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    captureException(error);
    return null;
  }
};

export default { get };
