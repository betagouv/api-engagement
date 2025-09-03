import { DATA_SUBVENTION_TOKEN } from "../config";
import { captureException, captureMessage } from "../error";

const get = async (path: string, body?: BodyInit, options?: RequestInit) => {
  try {
    const response = await fetch(`https://api.datasubvention.beta.gouv.fr${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": DATA_SUBVENTION_TOKEN,
      } as HeadersInit,
      body: JSON.stringify(body),
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.message?.includes("Multiple associations found")) {
        captureMessage(`Multiple associations found`, { extra: { path, body } });
        return null;
      }
      throw new Error(`Failed to fetch data from ${path}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    captureException(error);
    return null;
  }
};

export default { get };
