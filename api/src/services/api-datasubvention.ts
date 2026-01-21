import { DATA_SUBVENTION_TOKEN } from "../config";
import { captureException, captureMessage } from "../error";

const get = async (path: string, body?: BodyInit, options?: RequestInit, retries = 0) => {
  try {
    if (!DATA_SUBVENTION_TOKEN) {
      return null;
    }
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
      if (response.status === 401) {
        captureException("[DataSubvention] Unauthorized", { extra: { path, body } });
        return null;
      }
      if (response.status === 404) {
        return null;
      }
      if (response.status === 429) {
        console.log(`[DataSubvention] Rate limit exceeded, retrying...${retries + 1}/3`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        // Retry the request
        if (retries < 3) {
          return await get(path, body, options, retries + 1);
        } else {
          captureException("[DataSubvention] Rate limit exceeded after 3 retries", { extra: { path, body } });
          return null;
        }
      }
      const error = await response.json();
      if (error.message?.includes("Multiple associations found")) {
        captureMessage("[DataSubvention] Multiple associations found", { extra: { path, body } });
        return null;
      }
      if (error.message?.includes("Votre recherche pointe vers une entité qui n'est pas une association")) {
        captureMessage("[DataSubvention] Entity not an association", { extra: { path, body } });
        return null;
      }
      console.error(response.statusText);
      throw new Error("[DataSubvention] Failed to fetch data");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    captureException(error, { extra: { path, body, retries } });
    return null;
  }
};

export default { get };
