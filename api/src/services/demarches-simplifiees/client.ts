import { DEMARCHES_SIMPLIFIEES_TOKEN } from "@/config";
import { captureException } from "@/error";
import { DEMARCHES_SIMPLIFIEES_BASE_URL } from "@/services/demarches-simplifiees/utils";

// L'API de démarches-simplifiées est une API GraphQL unique (un seul endpoint POST).
// On envoie une requête GraphQL (query + variables) et on récupère soit des données,
// soit un tableau d'erreurs. Doc : https://doc.demarches-simplifiees.fr/api-graphql
// L'instance (GraphQL + API publique) est dérivée de DEMARCHES_SIMPLIFIEES_BASE_URL.

interface DemarchesSimplifieesSuccess<T> {
  ok: true;
  data: T;
}
interface DemarchesSimplifieesError {
  ok: false;
  message: string;
}

export type DemarchesSimplifieesResponse<T> = DemarchesSimplifieesSuccess<T> | DemarchesSimplifieesError;

// Fonction de base : envoie n'importe quelle requête GraphQL et renvoie la donnée typée.
export const query = async <T = unknown>(graphqlQuery: string, variables: Record<string, unknown> = {}): Promise<DemarchesSimplifieesResponse<T>> => {
  try {
    if (!DEMARCHES_SIMPLIFIEES_TOKEN) {
      return { ok: false, message: "DEMARCHES_SIMPLIFIEES_TOKEN is not set" };
    }

    const response = await fetch(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/api/v2/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEMARCHES_SIMPLIFIEES_TOKEN}`,
      },
      body: JSON.stringify({ query: graphqlQuery, variables }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        captureException("[DemarchesSimplifiees] Unauthorized");
        return { ok: false, message: "Unauthorized" };
      }
      console.error("[DemarchesSimplifiees] HTTP error", response.status, response.statusText);
      return { ok: false, message: `HTTP ${response.status} ${response.statusText}` };
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
