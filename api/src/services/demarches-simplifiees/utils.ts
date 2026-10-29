import { publisherDemarcheSimplifieesService } from "@/services/publisher-demarches-simplifiees";
import { slugify } from "@/utils";

// Instance qui héberge la démarche (par défaut demarche.numerique.gouv.fr, l'instance DINUM).
export const DEMARCHES_SIMPLIFIEES_BASE_URL = process.env.DEMARCHES_SIMPLIFIEES_BASE_URL || "https://demarche.numerique.gouv.fr";

// Hosts de l'instance configurée. Une démarche est toujours résolue sur cette instance (cf. `getDemarcheNumberBySlug`,
// qui reconstruit l'URL en `${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer/<slug>`) : une URL hébergée ailleurs n'est donc
// pas une démarche exploitable, même si son chemin ressemble à celui d'une démarche. L'instance DINUM est aussi servie
// sur son ancien domaine (www.demarches-simplifiees.fr), encore utilisé dans les liens de candidature de certains partenaires.
const DEMARCHES_SIMPLIFIEES_HOST = new URL(DEMARCHES_SIMPLIFIEES_BASE_URL).host;
const DEMARCHES_SIMPLIFIEES_HOSTS =
  DEMARCHES_SIMPLIFIEES_HOST === "demarche.numerique.gouv.fr" ? [DEMARCHES_SIMPLIFIEES_HOST, "www.demarches-simplifiees.fr"] : [DEMARCHES_SIMPLIFIEES_HOST];

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
    if (!DEMARCHES_SIMPLIFIEES_HOSTS.includes(parsed.host)) {
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

// Champ d'un formulaire DN tel que décrit par la démarche (`champDescriptors`). `__typename` donne le type du champ
// (ex. DateChampDescriptor) ; `birthdate` n'est renseigné que pour un champ date marqué "date de naissance".
export interface ChampDescriptor {
  __typename: string;
  label: string;
  birthdate?: boolean | null;
}

// Champ rempli d'un dossier DN. Les valeurs typées (date, pays, commune, adresse) ne sont présentes
// que pour le type de champ correspondant ; `stringValue` est toujours disponible en repli.
export interface DossierChamp {
  __typename: string;
  label: string;
  stringValue: string | null;
  date?: string | null;
  pays?: { code: string } | null;
  commune?: { postalCode: string | null } | null;
  address?: { postalCode: string; countryCode: string | null } | null;
}

// Identité du demandeur d'un dossier (bloc « Votre identité », hors formulaire). Pour un dossier déposé « pour une autre
// personne », c'est le bénéficiaire, donc bien le candidat. `dateDeNaissance` n'est renseignée que si la démarche la demande.
export interface DossierDemandeur {
  civilite?: "M" | "Mme" | null;
  dateDeNaissance?: string | null;
}

// Libellés des champs du formulaire DN à lire pour construire les customAttributes candidate* d'une candidature.
// La civilité n'en fait pas partie : elle est lue sur le demandeur du dossier.
export interface CandidateFields {
  birthDateField: string | null;
  countryField: string | null;
  postalCodeField: string | null;
}

const CANDIDATE_FIELD_KEYS: (keyof CandidateFields)[] = ["birthDateField", "countryField", "postalCodeField"];

const GENDERS: Record<string, string> = { M: "monsieur", Mme: "madame" };

const hasLabel = (items: { label: string }[], label: string) => items.some((item) => slugify(item.label) === slugify(label));

const labelContains = (label: string, keywords: string[]) => keywords.some((keyword) => slugify(label).includes(keyword));

// Mot entier du libellé, pour les mots-clés courts contenus dans d'autres mots (ex. "age" dans "engagement").
const labelHasWord = (label: string, word: string) => slugify(label).split("-").includes(word);

// Devine les champs date de naissance, pays et code postal d'un formulaire DN, sans connaître leur libellé exact :
// on privilégie le type du champ (champ date "naissance", pays, commune/adresse hors lieu de naissance), puis des mots-clés du libellé.
// À défaut de date de naissance, `birthDateField` peut désigner un champ « Âge » : l'âge déclaré y est lu tel quel.
export const detectCandidateFields = (descriptors: ChampDescriptor[]): CandidateFields => {
  const findLabel = (predicate: (descriptor: ChampDescriptor) => boolean) => descriptors.find(predicate)?.label ?? null;

  return {
    birthDateField:
      findLabel((descriptor) => descriptor.__typename === "DateChampDescriptor" && Boolean(descriptor.birthdate)) ??
      findLabel((descriptor) => descriptor.__typename === "DateChampDescriptor" && labelContains(descriptor.label, ["naissance"])) ??
      findLabel((descriptor) => labelContains(descriptor.label, ["date"]) && labelContains(descriptor.label, ["naissance"])) ??
      findLabel((descriptor) => labelHasWord(descriptor.label, "age")),
    countryField: findLabel((descriptor) => descriptor.__typename === "PaysChampDescriptor") ?? findLabel((descriptor) => labelContains(descriptor.label, ["pays", "nationalite"])),
    postalCodeField:
      findLabel((descriptor) => labelContains(descriptor.label, ["code-postal"])) ??
      findLabel(
        (descriptor) =>
          (descriptor.__typename === "CommuneChampDescriptor" || descriptor.__typename === "AddressChampDescriptor") && !labelContains(descriptor.label, ["naissance"])
      ),
  };
};

// Champs à lire sur une démarche : ceux configurés dans le back-office, sinon ceux détectés automatiquement.
// Un champ configuré absent du formulaire (libellé modifié côté DN) est remonté dans `missingFields`.
export const resolveCandidateFields = (configured: CandidateFields, descriptors: ChampDescriptor[]) => {
  const detected = detectCandidateFields(descriptors);
  const fields = { ...detected };
  const missingFields: string[] = [];

  for (const key of CANDIDATE_FIELD_KEYS) {
    const field = configured[key];
    if (!field) {
      continue;
    }
    if (hasLabel(descriptors, field)) {
      fields[key] = field;
    } else {
      missingFields.push(field);
    }
  }

  return { fields, missingFields };
};

const parseBirthDate = (champ: DossierChamp | undefined): Date | null => {
  if (champ?.date) {
    return new Date(champ.date);
  }
  const match = champ?.stringValue?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) {
    return null;
  }
  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
};

export const computeAge = (birthDate: Date, referenceDate: Date): number => {
  const age = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayPassed =
    referenceDate.getUTCMonth() > birthDate.getUTCMonth() || (referenceDate.getUTCMonth() === birthDate.getUTCMonth() && referenceDate.getUTCDate() >= birthDate.getUTCDate());
  return birthdayPassed ? age : age - 1;
};

// Construit les customAttributes candidate* d'une candidature à partir d'un dossier, avec la même nomenclature
// que les autres comptes pompiers (ex. { candidateAge: "35", candidateGender: "monsieur", candidateCountry: "FR", candidatePostalCode: "59560" }).
// L'âge est lu tel quel si le champ configuré est un champ « Âge » (nombre), sinon calculé à la date de dépôt du dossier
// depuis le champ date de naissance ou à défaut l'identité du demandeur.
// La civilité vient toujours du demandeur. Seuls les attributs trouvés sont renvoyés.
export const extractCandidateAttributes = (
  dossier: { champs: DossierChamp[]; demandeur: DossierDemandeur | null },
  fields: CandidateFields,
  referenceDate: Date
): Record<string, string> => {
  const findChamp = (field: string | null) => (field ? dossier.champs.find((champ) => slugify(champ.label) === slugify(field)) : undefined);
  const attributes: Record<string, string> = {};

  const birthDateChamp = findChamp(fields.birthDateField);
  const declaredAge = birthDateChamp?.stringValue?.match(/^\s*(\d{1,3})\s*(ans)?\s*$/i)?.[1];
  const birthDateString = dossier.demandeur?.dateDeNaissance;
  const birthDate = parseBirthDate(birthDateChamp) ?? (birthDateString ? new Date(birthDateString) : null);
  const age = declaredAge ? Number(declaredAge) : birthDate && !Number.isNaN(birthDate.getTime()) ? computeAge(birthDate, referenceDate) : null;
  if (age !== null && age >= 0 && age < 120) {
    attributes.candidateAge = String(age);
  }

  const civilite = dossier.demandeur?.civilite;
  if (civilite) {
    attributes.candidateGender = GENDERS[civilite];
  }

  const countryChamp = findChamp(fields.countryField);
  const country = countryChamp?.pays?.code ?? countryChamp?.address?.countryCode ?? countryChamp?.stringValue;
  if (country) {
    attributes.candidateCountry = country;
  }

  const postalCodeChamp = findChamp(fields.postalCodeField);
  const postalCode = postalCodeChamp?.commune?.postalCode ?? postalCodeChamp?.address?.postalCode ?? postalCodeChamp?.stringValue?.match(/\b\d{5}\b/)?.[0];
  if (postalCode) {
    attributes.candidatePostalCode = postalCode;
  }

  return attributes;
};
