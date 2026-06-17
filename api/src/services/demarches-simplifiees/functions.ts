import { captureException } from "@/error";
import { DEMARCHES_SIMPLIFIEES_BASE_URL, isRedirectionAnnotation, REDIRECTION_ANNOTATION_LABEL } from "@/services/demarches-simplifiees/utils";

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
        annotations {
          key
          value
        }
      }
    }
  `;
  return query<{ dossier: { id: string; number: number; state: string; dateDepot: string; usager: { email: string } } }>(graphqlQuery, { number });
};

// Récupère l'id de l'annotation "Identifiant de la redirection" d'une démarche, au format de clé de
// préremplissage (`champ_<id sans ==>`). C'est cette clé qu'on passe en query param pour préremplir
// l'annotation avec l'id du clic. Renvoie une erreur si l'annotation n'existe pas sur la démarche.
export const getAnnotationId = async (demarcheNumber: number): Promise<DemarchesSimplifieesResponse<string>> => {
  const graphqlQuery = `
    query getAnnotationDescriptors($number: Int!) {
      demarche(number: $number) {
        activeRevision {
          annotationDescriptors {
            id
            label
          }
        }
      }
    }
  `;

  const result = await query<{ demarche: { activeRevision: { annotationDescriptors: { id: string; label: string }[] } } }>(graphqlQuery, { number: demarcheNumber });
  if (!result.ok) {
    return result;
  }

  const annotation = result.data.demarche.activeRevision.annotationDescriptors.find((descriptor) => isRedirectionAnnotation(descriptor.label));
  if (!annotation) {
    return { ok: false, message: `Annotation "${REDIRECTION_ANNOTATION_LABEL}" not found` };
  }

  return { ok: true, data: `champ_${annotation.id.replace("==", "")}` };
};

interface DossierNode {
  id: string;
  number: number;
  state: string;
  dateDepot: string | null;
  usager: { email: string };
  annotations: { label: string; stringValue: string | null }[];
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
            annotations {
              label
              stringValue
            }
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
