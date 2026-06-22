import { publisherService } from "@/services/publisher";
import { slugify } from "@/utils";

import { getDemarcheNumberBySlug } from "./functions";

// Instance qui héberge la démarche (par défaut demarche.numerique.gouv.fr, l'instance DINUM).
export const DEMARCHES_SIMPLIFIEES_BASE_URL = process.env.DEMARCHES_SIMPLIFIEES_BASE_URL || "https://demarche.numerique.gouv.fr";

const DEMARCHE_NUMERIQUE_HOST = "demarche.numerique.gouv.fr";

// Libellé de l'annotation préremplie avec l'id du clic lors de la redirection. C'est par ce libellé qu'on
// retrouve la valeur (l'id du clic) dans les annotations d'un dossier, côté job d'import des candidatures.
export const REDIRECTION_ANNOTATION_LABEL = slugify("Identifiant de la redirection");

// Si l'URL de candidature pointe vers demarche.numerique.gouv.fr, on ajoute en query param l'id du clic sous la
// clé de l'annotation à préremplir. Comme un publisher peut avoir plusieurs démarches, on résout le slug de l'URL
// (/commencer/<slug>) en numéro de démarche, puis on retrouve la démarche du publisher annonceur via ce numéro pour
// récupérer sa clé d'annotation. Le clic est ainsi reporté dans le dossier, ce qui permettra de relier dossier et clic
// plus tard. On renvoie l'URL de redirection, ou null si ce n'est pas une démarche numérique connue de ce publisher.
export const generateDemarcheNumeriqueDossierUrl = async (applicationUrl: string | null | undefined, publisherId: string, clickId: string): Promise<string | null> => {
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

  const numberResult = await getDemarcheNumberBySlug(slug);
  if (!numberResult.ok) {
    return null;
  }

  const demarche = await publisherService.findDemarcheSimplifieeByPublisherAndNumber(publisherId, numberResult.data);
  if (!demarche?.annotationKey) {
    return null;
  }

  parsedUrl.searchParams.set(demarche.annotationKey, clickId);
  return parsedUrl.toString();
};

export const isRedirectionAnnotation = (label: string): boolean => {
  return slugify(label) === REDIRECTION_ANNOTATION_LABEL;
};
