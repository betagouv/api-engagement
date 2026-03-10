import { DATA_SUBVENTION_TOKEN } from "@/config";
import { captureException } from "@/error";

interface DataSubventionSuccessResponse {
  ok: true;
  association: any;
  etablissement: any;
}
interface DataSubventionErrorResponse {
  ok: false;
  message: string;
}

type DataSubventionResponse = DataSubventionSuccessResponse | DataSubventionErrorResponse;

const get = async (path: string, body?: BodyInit, options?: RequestInit, retries = 0): Promise<DataSubventionResponse> => {
  try {
    if (!DATA_SUBVENTION_TOKEN) {
      return { ok: false, message: "DATA_SUBVENTION_TOKEN is not set" };
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
        return { ok: false, message: "Unauthorized" };
      }
      if (response.status === 404) {
        return { ok: false, message: "Not found" };
      }
      if (response.status === 429) {
        console.log(`[DataSubvention] Rate limit exceeded, retrying...${retries + 1}/3`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        // Retry the request
        if (retries < 3) {
          return await get(path, body, options, retries + 1);
        } else {
          return { ok: false, message: "Rate limit exceeded after 3 retries" };
        }
      }
      if (response.status === 500) {
        console.error("[DataSubvention] Internal server error", { extra: { path, body } });
        return { ok: false, message: "DataSubvention internal server error" };
      }
      const error = await response.json();
      if (error.message?.includes("Multiple associations found")) {
        return { ok: false, message: "Multiple associations found" };
      }
      if (error.message?.includes("Votre recherche pointe vers une entité qui n'est pas une association")) {
        return { ok: false, message: "Entity not an association" };
      }
      console.error(response.statusText);
      throw new Error("[DataSubvention] Failed to fetch data");
    }

    const data = await response.json();
    return { ok: true, association: data.association, etablissement: data.etablissement };
  } catch (error) {
    captureException(error, { extra: { path, body, retries } });
    return { ok: false, message: "DataSubvention API error" };
  }
};

export default { get };
