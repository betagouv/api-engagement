import { publisherDemarcheSimplifieesService } from "@/services/publisher-demarches-simplifiees";
import { slugify } from "@/utils";

// Instance qui héberge la démarche (par défaut demarche.numerique.gouv.fr, l'instance DINUM).
export const DEMARCHES_SIMPLIFIEES_BASE_URL = process.env.DEMARCHES_SIMPLIFIEES_BASE_URL || "https://demarche.numerique.gouv.fr";

// Libellé de l'annotation préremplie avec l'id du clic lors de la redirection. C'est par ce libellé qu'on
// retrouve la valeur (l'id du clic) dans les annotations d'un dossier, côté job d'import des candidatures.
export const REDIRECTION_ANNOTATION_LABEL = slugify("Identifiant de la redirection");

// Slug d'une démarche dans son URL publique (/commencer/<slug>), ou null si l'URL n'en contient pas / est invalide.
export const extractDemarcheSlug = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).pathname.match(/\/commencer\/([^/?#]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
};

// Si l'URL de candidature est une démarche numérique configurée pour ce publisher, on y ajoute en query param l'id
// du clic sous la clé de l'annotation à préremplir (le clic est ainsi reporté dans le dossier). La démarche est
// retrouvée par son slug parmi celles du publisher — pas d'appel réseau. Renvoie l'URL de redirection, ou null.
export const generateDemarcheNumeriqueDossierUrl = async (applicationUrl: string | null | undefined, publisherId: string, clickId: string): Promise<string | null> => {
  const slug = extractDemarcheSlug(applicationUrl);
  if (!slug) {
    return null;
  }

  const demarches = await publisherDemarcheSimplifieesService.findByPublisher(publisherId);
  const demarche = demarches.find((demarche) => extractDemarcheSlug(demarche.url) === slug);
  if (!demarche?.annotationKey) {
    return null;
  }

  const url = new URL(applicationUrl as string);
  url.searchParams.set(demarche.annotationKey, clickId);
  return url.toString();
};

export const isRedirectionAnnotation = (label: string): boolean => {
  return slugify(label) === REDIRECTION_ANNOTATION_LABEL;
};
