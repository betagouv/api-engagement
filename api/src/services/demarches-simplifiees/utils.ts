import { slugify } from "@/utils";
import { getAnnotationId } from "./functions";

// Instance qui héberge la démarche (par défaut demarche.numerique.gouv.fr, l'instance DINUM).
export const DEMARCHES_SIMPLIFIEES_BASE_URL = process.env.DEMARCHES_SIMPLIFIEES_BASE_URL || "https://demarche.numerique.gouv.fr";

const DEMARCHE_NUMERIQUE_HOST = "demarche.numerique.gouv.fr";

// Mapping slug → numéro de démarche pour les démarches connues (évite un appel réseau).
// Le slug est le segment d'URL de /commencer/<slug>.
export const DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP: Record<string, number> = {
  "test-formulaire-spv": 149326,
};

export const DEMARCHE_SIMPLIFIEES_ANNOTATION_KEY_MAP: Record<string, string> = {
  "test-formulaire-spv": "champ_Q2hhbXAtNjYyNjkxMA",
};

// Libellé de l'annotation préremplie avec l'id du clic lors de la redirection. C'est par ce libellé qu'on
// retrouve la valeur (l'id du clic) dans les annotations d'un dossier, côté job d'import des candidatures.
export const REDIRECTION_ANNOTATION_LABEL = slugify("Identifiant de la redirection");

// Si l'URL de candidature pointe vers demarche.numerique.gouv.fr, on ajoute en query param l'id du clic
// sous la clé de l'annotation à préremplir (DEMARCHE_SIMPLIFIEES_ANNOTATION_KEY_MAP du slug). Le clic est
// ainsi reporté dans le dossier, ce qui permettra de relier dossier et clic plus tard. On renvoie l'URL
// de redirection, ou null si ce n'est pas une démarche numérique (ou si aucune annotation n'est connue).
export const generateDemarcheNumeriqueDossierUrl = async (applicationUrl: string | null | undefined, clickId: string): Promise<string | null> => {
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

  let annotationKey = DEMARCHE_SIMPLIFIEES_ANNOTATION_KEY_MAP[slug];
  if (!annotationKey) {
    const demarcheNumber = DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP[slug];
    const result = demarcheNumber ? await getAnnotationId(demarcheNumber) : null;
    if (!result || !result.ok) {
      return null;
    }
    annotationKey = result.data;
  }

  parsedUrl.searchParams.set(annotationKey, clickId);
  return parsedUrl.toString();
};

export const isRedirectionAnnotation = (label: string): boolean => {
  return slugify(label) === REDIRECTION_ANNOTATION_LABEL;
};
