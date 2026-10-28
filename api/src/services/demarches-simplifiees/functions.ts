import { captureException } from "@/error";
import {
  CandidateFields,
  ChampDescriptor,
  DEMARCHES_SIMPLIFIEES_BASE_URL,
  detectCandidateFields,
  DossierChamp,
  DossierDemandeur,
  extractDemarcheSlug,
  isRedirectionAnnotation,
  REDIRECTION_ANNOTATION_LABEL,
} from "@/services/demarches-simplifiees/utils";

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
          label
          stringValue
        }
      }
    }
  `;
  return query<{ dossier: DossierNode }>(graphqlQuery, { number });
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

// Champs du formulaire (descripteurs) d'une démarche via son schéma public de préremplissage (/preremplir/<slug>/schema).
// Pas de token nécessaire : fonctionne même si notre compte n'a pas accès à la démarche. Ne renvoie que la structure du
// formulaire (pas les dossiers) et n'est disponible que si le préremplissage est ouvert sur la démarche.
export const getPublicChampDescriptors = async (slug: string): Promise<DemarchesSimplifieesResponse<ChampDescriptor[]>> => {
  try {
    const response = await fetch(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/preremplir/${encodeURIComponent(slug)}/schema`);
    if (!response.ok) {
      return { ok: false, message: `HTTP ${response.status} ${response.statusText}` };
    }
    const body = (await response.json()) as { revision: { champDescriptors: ChampDescriptor[] } };
    return { ok: true, data: body.revision.champDescriptors };
  } catch (error) {
    captureException(error);
    return { ok: false, message: "DemarchesSimplifiees API error" };
  }
};

// Champs du formulaire (descripteurs) de la révision active d'une démarche : libellé, type et, pour un champ date,
// s'il s'agit d'une date de naissance. Sert à détecter / vérifier les champs à lire pour enrichir les candidatures.
// On lit d'abord le schéma public (sans token) si on connaît le slug, puis l'API GraphQL en repli.
export const getChampDescriptors = async (demarcheNumber: number, slug?: string | null): Promise<DemarchesSimplifieesResponse<ChampDescriptor[]>> => {
  if (slug) {
    const publicResult = await getPublicChampDescriptors(slug);
    if (publicResult.ok) {
      return publicResult;
    }
  }

  const graphqlQuery = `
    query getChampDescriptors($number: Int!) {
      demarche(number: $number) {
        activeRevision {
          champDescriptors {
            __typename
            label
            ... on DateChampDescriptor {
              birthdate
            }
          }
        }
      }
    }
  `;

  const result = await query<{ demarche: { activeRevision: { champDescriptors: ChampDescriptor[] } } }>(graphqlQuery, { number: demarcheNumber });
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: result.data.demarche.activeRevision.champDescriptors };
};

interface DossierNode {
  id: string;
  number: number;
  state: string;
  dateDepot: string | null;
  usager: { email: string };
  annotations: { label: string; stringValue: string | null }[];
  champs: DossierChamp[];
  demandeur: DossierDemandeur | null;
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
            demandeur {
              ... on PersonnePhysique {
                civilite
                dateDeNaissance
              }
            }
            champs {
              __typename
              label
              stringValue
              ... on DateChamp {
                date
              }
              ... on PaysChamp {
                pays {
                  code
                }
              }
              ... on CommuneChamp {
                commune {
                  postalCode
                }
              }
              ... on AddressChamp {
                address {
                  postalCode
                  countryCode
                }
              }
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

// Vérifie ce que notre jeton peut lire sur une démarche : la démarche elle-même, et ses dossiers (lus par le job d'import
// des candidatures). DN masque une démarche ("hidden due to permissions") quand le compte du jeton n'en est ni
// administrateur ni instructeur.
export const getDemarcheAccess = async (demarcheNumber: number): Promise<{ demarche: boolean; dossiers: boolean }> => {
  const demarche = await getDemarche(demarcheNumber);
  if (!demarche.ok) {
    return { demarche: false, dossiers: false };
  }

  const graphqlQuery = `
    query getDemarcheDossiersAccess($number: Int!) {
      demarche(number: $number) {
        dossiers(first: 1) {
          nodes {
            number
          }
        }
      }
    }
  `;
  const dossiers = await query(graphqlQuery, { number: demarcheNumber });
  return { demarche: true, dossiers: dossiers.ok };
};

// Résout une démarche à partir de son URL publique (/commencer/<slug>) : on extrait le slug, on le
// convertit en numéro, puis on récupère le nom (title), la clé d'annotation et les champs candidat détectés
// dans le formulaire. Tout sauf le numéro est best-effort (null si indisponible) ; seul le numéro est requis
// pour considérer la résolution réussie.
export const resolveDemarcheByUrl = async (
  url: string
): Promise<DemarchesSimplifieesResponse<{ number: number; name: string | null; annotationKey: string | null } & CandidateFields>> => {
  const slug = extractDemarcheSlug(url);
  if (!slug) {
    return { ok: false, message: "URL must point to a /commencer/<slug> démarche" };
  }

  const numberResult = await getDemarcheNumberBySlug(slug);
  if (!numberResult.ok) {
    return numberResult;
  }
  const number = numberResult.data;

  const [annotation, demarche, champDescriptors] = await Promise.all([getAnnotationId(number), getDemarche(number), getChampDescriptors(number, slug)]);

  return {
    ok: true,
    data: {
      number,
      name: demarche.ok ? demarche.data.demarche.title : null,
      annotationKey: annotation.ok ? annotation.data : null,
      ...detectCandidateFields(champDescriptors.ok ? champDescriptors.data : []),
    },
  };
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
