import demarchesSimplifiees from "@/services/demarches-simplifiees";

// Instance qui héberge la démarche (par défaut demarche.numerique.gouv.fr, l'instance DINUM).
export const DEMARCHES_SIMPLIFIEES_BASE_URL = process.env.DEMARCHES_SIMPLIFIEES_BASE_URL || "https://demarche.numerique.gouv.fr";

const DEMARCHE_NUMERIQUE_HOST = "demarche.numerique.gouv.fr";

// Mapping slug → numéro de démarche pour les démarches connues (évite un appel réseau).
// Le slug est le segment d'URL de /commencer/<slug>.
export const DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP: Record<string, number> = {
  "test-formulaire-spv": 149326,
};

// Si l'URL de candidature pointe vers demarche.numerique.gouv.fr, on crée un dossier prérempli côté
// Démarches Simplifiées. On renvoie son numéro (à stocker dans customAttributes) et son URL (cible de
// redirection à la place de l'applicationUrl générique). Le numéro de démarche est résolu depuis le
// slug de l'URL : d'abord via DEMARCHE_MAP, sinon via l'API (getDemarcheNumberBySlug).
export const createDemarcheNumeriqueDossier = async (applicationUrl: string | null | undefined): Promise<{ number: number; url: string } | null> => {
  if (!applicationUrl) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(applicationUrl);
  } catch (error) {
    return null;
  }
  if (parsedUrl.hostname !== DEMARCHE_NUMERIQUE_HOST) {
    return null;
  }

  const slug = parsedUrl.pathname.match(/\/commencer\/([^/?#]+)/)?.[1];
  if (!slug) {
    return null;
  }

  let demarcheNumber = DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP[slug];
  if (!demarcheNumber) {
    const found = await demarchesSimplifiees.getDemarcheNumberBySlug(slug);
    if (!found.ok) {
      return null;
    }
    demarcheNumber = found.data;
  }

  const result = await demarchesSimplifiees.createDossier(demarcheNumber);
  if (!result.ok) {
    return null;
  }

  const number = result.data?.dossier_number ?? null;
  const url = result.data?.dossier_url ?? null;
  if (!number || !url) {
    return null;
  }
  return { number, url };
};
