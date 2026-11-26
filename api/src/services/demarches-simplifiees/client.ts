import { ProxyAgent } from "undici";

import { DEMARCHES_SIMPLIFIEES_TOKEN, PUBLIC_PROXY_URL } from "@/config";
import { captureException } from "@/error";
import { DEMARCHES_SIMPLIFIEES_BASE_URL } from "@/services/demarches-simplifiees/utils";

// L'API de démarches-simplifiées est une API GraphQL unique (un seul endpoint POST).
// On envoie une requête GraphQL (query + variables) et on récupère soit des données,
// soit un tableau d'erreurs. Doc : https://doc.demarches-simplifiees.fr/api-graphql
// L'instance (GraphQL + API publique) est dérivée de DEMARCHES_SIMPLIFIEES_BASE_URL.

// Tous les appels à Démarche Numérique sortent par le proxy public (IP de sortie fixe) quand il est configuré : les jetons
// sont restreints à cette adresse, et les conteneurs n'atteignent pas l'instance en direct (ConnectTimeoutError).
// L'agent est créé une seule fois : il conserve son pool de connexions vers le proxy.
let proxyDispatcher: ProxyAgent | undefined;
const getProxyDispatcher = (): ProxyAgent | undefined => {
  if (!PUBLIC_PROXY_URL) {
    return undefined;
  }
  if (!proxyDispatcher) {
    proxyDispatcher = new ProxyAgent(PUBLIC_PROXY_URL);
    // On ne journalise que l'hôte : l'URL peut contenir les identifiants du proxy.
    console.log(`[DemarchesSimplifiees] Calls routed through public proxy ${new URL(PUBLIC_PROXY_URL).host}`);
  }
  return proxyDispatcher;
};

// `dispatcher` (option undici) n'existe pas dans le type RequestInit de lib.dom.
type FetchInit = RequestInit & { dispatcher?: ProxyAgent };

// fetch vers l'instance Démarche Numérique (`path` relatif à DEMARCHES_SIMPLIFIEES_BASE_URL), via le proxy s'il est configuré.
export const fetchDemarchesSimplifiees = (path: string, init: RequestInit = {}) => {
  const dispatcher = getProxyDispatcher();
  const fetchInit: FetchInit = dispatcher ? { ...init, dispatcher } : init;
  return fetch(`${DEMARCHES_SIMPLIFIEES_BASE_URL}${path}`, fetchInit);
};

interface DemarchesSimplifieesSuccess<T> {
  ok: true;
  data: T;
}
interface DemarchesSimplifieesError {
  ok: false;
  message: string;
  // Code HTTP quand l'API a rejeté la requête (absent pour une erreur GraphQL, renvoyée en HTTP 200).
  status?: number;
}

export type DemarchesSimplifieesResponse<T> = DemarchesSimplifieesSuccess<T> | DemarchesSimplifieesError;

// Fonction de base : envoie n'importe quelle requête GraphQL et renvoie la donnée typée.
// `token` : token API fourni par le partenaire ; à défaut, on utilise le token global (compte API Engagement).
export const query = async <T = unknown>(graphqlQuery: string, variables: Record<string, unknown> = {}, token?: string | null): Promise<DemarchesSimplifieesResponse<T>> => {
  try {
    const apiToken = token || DEMARCHES_SIMPLIFIEES_TOKEN;
    if (!apiToken) {
      return { ok: false, message: "DEMARCHES_SIMPLIFIEES_TOKEN is not set" };
    }

    const response = await fetchDemarchesSimplifiees("/api/v2/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ query: graphqlQuery, variables }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        captureException("[DemarchesSimplifiees] Unauthorized");
        return { ok: false, status: 401, message: "Unauthorized" };
      }
      console.error("[DemarchesSimplifiees] HTTP error", response.status, response.statusText);
      return { ok: false, status: response.status, message: `HTTP ${response.status} ${response.statusText}` };
    }

    // En GraphQL, le code HTTP est souvent 200 même en cas d'erreur : il faut lire le champ `errors`.
    const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
    if (body.errors?.length) {
      const message = body.errors.map((error) => error.message).join("; ");
      return { ok: false, message };
    }

    if (!body.data) {
      return { ok: false, message: "No data returned" };
    }

    return { ok: true, data: body.data };
  } catch (error) {
    captureException(error);
    return { ok: false, message: "DemarchesSimplifiees API error" };
  }
};
