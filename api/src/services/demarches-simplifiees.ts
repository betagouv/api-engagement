import { DEMARCHES_SIMPLIFIEES_DEMARCHE_NUMBER, DEMARCHES_SIMPLIFIEES_TOKEN } from "@/config";
import { captureException } from "@/error";

// L'API de démarches-simplifiées est une API GraphQL unique (un seul endpoint POST).
// On envoie une requête GraphQL (query + variables) et on récupère soit des données,
// soit un tableau d'erreurs. Doc : https://doc.demarches-simplifiees.fr/api-graphql

const DEMARCHES_SIMPLIFIEES_URL = "https://www.demarches-simplifiees.fr/api/v2/graphql";

interface DemarchesSimplifieesSuccess<T> {
  ok: true;
  data: T;
}
interface DemarchesSimplifieesError {
  ok: false;
  message: string;
}

type DemarchesSimplifieesResponse<T> = DemarchesSimplifieesSuccess<T> | DemarchesSimplifieesError;

// Fonction de base : envoie n'importe quelle requête GraphQL et renvoie la donnée typée.
const query = async <T = unknown>(graphqlQuery: string, variables: Record<string, unknown> = {}): Promise<DemarchesSimplifieesResponse<T>> => {
  try {
    if (!DEMARCHES_SIMPLIFIEES_TOKEN) {
      return { ok: false, message: "DEMARCHES_SIMPLIFIEES_TOKEN is not set" };
    }

    const response = await fetch(DEMARCHES_SIMPLIFIEES_URL, {
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

// Exemple de helper : récupère les infos de base d'une démarche par son numéro.
const getDemarche = async (number: number = DEMARCHES_SIMPLIFIEES_DEMARCHE_NUMBER) => {
  const graphqlQuery = `
    query getDemarche($number: Int!) {
      demarche(number: $number) {
        id
        number
        title
        state
        dateCreation
        labels {
          name
        }
      }
    }
  `;
  return query<{ demarche: { id: string; number: number; title: string; state: string; dateCreation: string } }>(graphqlQuery, { number });
};

// Exemple de helper : récupère un dossier par son numéro.
const getDossier = async (number: number) => {
  const graphqlQuery = `
    query getDossier($number: Int!) {
      dossier(number: $number) {
        id
        number
        state
        dateDepot
        usager {
          email
        }
      }
    }
  `;
  return query<{ dossier: { id: string; number: number; state: string; dateDepot: string; usager: { email: string } } }>(graphqlQuery, { number });
};

interface DossierNode {
  id: string;
  number: number;
  state: string;
  dateDepot: string | null;
  usager: { email: string };
}

interface DossiersPage {
  demarche: {
    dossiers: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: DossierNode[];
    };
  };
}

// Récupère TOUS les dossiers d'une démarche.
// En GraphQL, une liste paginée est une "connection" : on demande une page (max 100),
// et `pageInfo.endCursor` sert de curseur pour réclamer la page suivante via `after`.
// On boucle tant que `pageInfo.hasNextPage` est vrai.
const getAllDossiers = async (demarcheNumber: number = DEMARCHES_SIMPLIFIEES_DEMARCHE_NUMBER, createdSince?: Date): Promise<DemarchesSimplifieesResponse<DossierNode[]>> => {
  const graphqlQuery = `
    query getDemarcheDossiers($number: Int!, $after: String, $createdSince: ISO8601DateTime) {
      demarche(number: $number) {
        dossiers(first: 100, after: $after, createdSince: $createdSince) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            number
            state
            dateDepot
          }
        }
      }
    }
  `;

  const dossiers: DossierNode[] = [];
  let after: string | null = null;

  while (true) {
    const result: DemarchesSimplifieesResponse<DossiersPage> = await query<DossiersPage>(graphqlQuery, {
      number: demarcheNumber,
      after,
      createdSince: createdSince ? createdSince.toISOString() : null,
    });
    if (!result.ok) {
      return result;
    }

    const page: DossiersPage["demarche"]["dossiers"] = result.data.demarche.dossiers;
    dossiers.push(...page.nodes);

    if (!page.pageInfo.hasNextPage) {
      break;
    }
    after = page.pageInfo.endCursor;
  }

  return { ok: true, data: dossiers };
};

// Récupère l'URL publique où un usager crée un dossier ("commencer") pour une démarche.
// On passe par `demarcheDescriptor` (la vue publique d'une démarche) qui expose directement
// `demarcheURL` : pas besoin de reconstruire l'URL à partir d'un slug, l'API renvoie l'URL absolue.
const createDossier = async (demarcheNumber: number = DEMARCHES_SIMPLIFIEES_DEMARCHE_NUMBER, data: Record<string, unknown> = {}) => {
  try {
    const response = await fetch(`https://www.demarches-simplifiees.fr/api/public/v1/demarches/${demarcheNumber}/dossiers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      return { ok: false, message: "DemarchesSimplifiees API error" };
    }
    const body = await response.json();
    return { ok: true, data: body };
  } catch (error) {
    captureException(error);
    return { ok: false, message: "DemarchesSimplifiees API error" };
  }
};

export default { query, getDemarche, getDossier, getAllDossiers, createDossier };
