import { publisherDemarcheSimplifieesService } from "@/services/publisher-demarches-simplifiees";
import { slugify } from "@/utils";

// Instance qui héberge la démarche (par défaut demarche.numerique.gouv.fr, l'instance DINUM).
export const DEMARCHES_SIMPLIFIEES_BASE_URL = process.env.DEMARCHES_SIMPLIFIEES_BASE_URL || "https://demarche.numerique.gouv.fr";

// Host de l'instance configurée. Une démarche est toujours résolue sur cette instance (cf. `getDemarcheNumberBySlug`,
// qui reconstruit l'URL en `${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer/<slug>`) : une URL hébergée ailleurs n'est donc
// pas une démarche exploitable, même si son chemin ressemble à celui d'une démarche.
const DEMARCHES_SIMPLIFIEES_HOST = new URL(DEMARCHES_SIMPLIFIEES_BASE_URL).host;

// Libellé de l'annotation préremplie avec l'id du clic lors de la redirection. C'est par ce libellé qu'on
// retrouve la valeur (l'id du clic) dans les annotations d'un dossier, côté job d'import des candidatures.
export const REDIRECTION_ANNOTATION_LABEL = slugify("Identifiant de la redirection");

// Slug d'une démarche dans son URL publique (https://<instance>/commencer/<slug>), ou null si l'URL est invalide,
// ne pointe pas sur une démarche, ou est hébergée sur une autre instance que celle configurée.
export const extractDemarcheSlug = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.match(/^\/commencer\/([^/]+)/)?.[1];
    if (!slug) {
      return null;
    }
    if (parsed.host !== DEMARCHES_SIMPLIFIEES_HOST) {
      console.log(`[Démarches Simplifiées] URL /commencer/${slug} ignorée : hébergée sur ${parsed.host}, instance configurée ${DEMARCHES_SIMPLIFIEES_HOST}`);
      return null;
    }
    return slug;
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
  if (!demarche) {
    console.log(
      `[Démarches Simplifiées] Clic ${clickId} : démarche /commencer/${slug} non configurée chez le partenaire ${publisherId} (${demarches.length} démarche(s) connue(s): ${demarches.map((demarche) => demarche.url).join(", ") || "aucune"})`
    );
    return null;
  }
  if (!demarche.annotationKey) {
    console.log(`[Démarches Simplifiées] Clic ${clickId} : démarche ${demarche.number} (/commencer/${slug}) sans annotationKey, pas de préremplissage`);
    return null;
  }

  const url = new URL(applicationUrl as string);
  url.searchParams.set(demarche.annotationKey, clickId);
  console.log(`[Démarches Simplifiées] Clic ${clickId} prérempli sur la démarche ${demarche.number} (/commencer/${slug}) via l'annotation ${demarche.annotationKey}`);
  return url.toString();
};

export const isRedirectionAnnotation = (label: string): boolean => {
  return slugify(label) === REDIRECTION_ANNOTATION_LABEL;
};
