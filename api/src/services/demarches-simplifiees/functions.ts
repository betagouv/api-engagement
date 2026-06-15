import { captureException } from "@/error";
import { DEMARCHES_SIMPLIFIEES_BASE_URL } from "@/utils/demarches-simplifiees";

import { DemarchesSimplifieesResponse, query } from "./client";

// Exemple de helper : récupère les infos de base d'une démarche par son numéro.
export const getDemarche = async (number: number) => {
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
export const getDossier = async (number: number) => {
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
export const getAllDossiers = async (demarcheNumber: number, createdSince?: Date): Promise<DemarchesSimplifieesResponse<DossierNode[]>> => {
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
  let hasNextPage = true;

  while (hasNextPage) {
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

    hasNextPage = page.pageInfo.hasNextPage;
    after = page.pageInfo.endCursor;
  }

  return { ok: true, data: dossiers };
};

// Crée un dossier prérempli via l'API publique de préremplissage et renvoie sa réponse
// (dossier_number, dossier_url, etc.). Cet endpoint public ne nécessite pas de token.
export const createDossier = async (demarcheNumber: number, data: Record<string, unknown> = {}) => {
  try {
    const response = await fetch(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/api/public/v1/demarches/${demarcheNumber}/dossiers`, {
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

// Retrouve le numéro d'une démarche à partir de son slug (le segment d'URL de /commencer/<slug>).
// Le slug n'est pas exposé par l'API GraphQL : on lit la page publique "commencer", dont le titre
// contient le numéro de la démarche (ex. "... · #149326 · ..."). Pas de token nécessaire.
export const getDemarcheNumberBySlug = async (slug: string): Promise<DemarchesSimplifieesResponse<number>> => {
  try {
    const response = await fetch(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      return { ok: false, message: response.status === 404 ? "Démarche not found" : `HTTP ${response.status} ${response.statusText}` };
    }

    const html = await response.text();
    const match = html.match(/<title[^>]*>[^<]*#(\d+)/i);
    if (!match) {
      return { ok: false, message: "Démarche number not found in page" };
    }

    return { ok: true, data: Number.parseInt(match[1], 10) };
  } catch (error) {
    captureException(error);
    return { ok: false, message: "DemarchesSimplifiees API error" };
  }
};
