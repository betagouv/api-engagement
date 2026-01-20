import { METABASE_API_KEY, METABASE_URL } from "../config";

type VariableValue = string | number | boolean | Array<string | number>;
type QueryOptions = {
  parameters?: Array<unknown>;
  variables?: Record<string, VariableValue>;
  body?: Record<string, unknown>;
};

const buildParametersFromVariables = (variables?: QueryOptions["variables"]) => {
  if (!variables) {
    return undefined;
  }
  return Object.entries(variables).map(([key, value]) => ({
    type: Array.isArray(value) ? "date/range" : "string/=",
    target: ["variable", ["template-tag", key]],
    value,
  }));
};

const buildHeaders = () => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (METABASE_API_KEY) {
    headers["x-api-key"] = METABASE_API_KEY;
  }
  return headers;
};

export const metabaseService = {
  async queryCard(cardId: string | number, { parameters, variables, body }: QueryOptions = {}) {
    if (!METABASE_URL) {
      throw new Error("METABASE_URL is missing");
    }
    if (!METABASE_API_KEY) {
      throw new Error("METABASE_API_KEY is missing");
    }

    const payload: Record<string, unknown> = { ...(body || {}) };
    const computedParameters = parameters ?? buildParametersFromVariables(variables);
    if (computedParameters?.length) {
      payload.parameters = computedParameters;
    }

    const response = await fetch(`${METABASE_URL}/api/card/${cardId}/query`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  },
};
