import { METABASE_API_KEY, METABASE_URL } from "@/config";
import { METABASE_CARD_ACCESS } from "@/constants/metabase";
import { createTtlCache } from "@/services/cache";

type VariableValue = string | number | boolean | Array<string | number>;
type QueryOptions = {
  variables?: Record<string, VariableValue>;
};

type MetabaseCardParameter = {
  id: string;
  slug: string;
};

const resolveDateInTimezone = (value: string, timeZone: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const getCardParameters = async (cardId: string | number) => {
  const response = await fetch(`${METABASE_URL}/api/card/${cardId}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Metabase card ${cardId} metadata returned ${response.status}`);
  }

  const card = (await response.json()) as { parameters?: Array<MetabaseCardParameter> };
  return Array.isArray(card.parameters) ? card.parameters : [];
};

const buildParametersFromVariables = (variables: QueryOptions["variables"], cardId: string | number, cardParameters: Array<MetabaseCardParameter>) => {
  if (!variables) {
    return undefined;
  }

  const resolvedVariables = { ...variables };
  const userTz = resolvedVariables.user_tz as string;

  if (userTz && typeof resolvedVariables.from === "string") {
    resolvedVariables.from = resolveDateInTimezone(resolvedVariables.from, userTz);
  }

  if (userTz && typeof resolvedVariables.to === "string") {
    resolvedVariables.to = resolveDateInTimezone(resolvedVariables.to, userTz);
  }

  delete resolvedVariables.user_tz;

  const cardParametersBySlug = new Map(cardParameters.map((parameter) => [parameter.slug, parameter]));

  return Object.entries(resolvedVariables).map(([key, value]) => {
    const cardParameter = cardParametersBySlug.get(key);
    if (!cardParameter) {
      throw new Error(`Metabase parameter '${key}' is not configured on card ${cardId}`);
    }

    return {
      id: cardParameter.id,
      value,
    };
  });
};

const buildHeaders = () => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (METABASE_API_KEY) {
    headers["x-api-key"] = METABASE_API_KEY;
  }
  return headers;
};

type CardResult = { ok: boolean; status: number; data: unknown };

// Seules les cartes publiques sont mises en cache : les autres sont scopées par tenant et doivent rester à jour.
const publicCardCache = createTtlCache<CardResult>({ ttlMs: 5 * 60 * 1000 });

const cacheKey = (cardId: string | number, variables: QueryOptions["variables"]) =>
  `${cardId}:${JSON.stringify(Object.entries(variables ?? {}).sort(([a], [b]) => a.localeCompare(b)))}`;

const fetchCard = async (cardId: string | number, { variables }: QueryOptions): Promise<CardResult> => {
  if (!METABASE_URL) {
    throw new Error("METABASE_URL is missing");
  }
  if (!METABASE_API_KEY) {
    throw new Error("METABASE_API_KEY is missing");
  }

  const payload: Record<string, unknown> = {};
  const computedParameters = variables ? buildParametersFromVariables(variables, cardId, await getCardParameters(cardId)) : undefined;
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
};

export const metabaseService = {
  async queryCard(cardId: string | number, options: QueryOptions = {}) {
    if (METABASE_CARD_ACCESS[String(cardId)] !== "public") {
      return fetchCard(cardId, options);
    }
    return publicCardCache.getOrLoad(
      cacheKey(cardId, options.variables),
      () => fetchCard(cardId, options),
      (result) => result.ok
    );
  },

  clearCache() {
    publicCardCache.clear();
  },
};
