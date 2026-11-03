import { useEffect, useState } from "react";
import { RiAddLine, RiCheckboxCircleFill, RiCloseCircleFill, RiDeleteBinLine, RiErrorWarningFill } from "react-icons/ri";

import LabelledInput from "@/components/form/LabelledInput";
import RadioInput from "@/components/form/RadioInput";
import Toggle from "@/components/Toggle";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { toast } from "@/services/toast";

const EMPTY_DEMARCHE = {
  number: null,
  name: null,
  url: null,
  annotationKey: null,
  fields: {},
};

// Champs du formulaire DN lus par le job d'import pour enrichir les candidatures (customAttributes candidate*),
// par type de champ qualifié (enum DemarcheSimplifieeFieldType côté API).
const CANDIDATE_FIELDS = [
  { type: "BIRTH_DATE", label: "Champ « Date de naissance » ou « Âge »", attribute: "candidateAge" },
  { type: "COUNTRY", label: "Champ « Pays »", attribute: "candidateCountry" },
  { type: "POSTAL_CODE", label: "Champ « Code postal »", attribute: "candidatePostalCode" },
];

const DemarcheSimplifiee = ({ values, onChange, errors }) => {
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [accessByNumber, setAccessByNumber] = useState({});
  const [checkByIndex, setCheckByIndex] = useState({});
  const [redirectionIdByIndex, setRedirectionIdByIndex] = useState({});
  const { isDemarcheSimplifiee } = values;
  const demarches = values.demarcheSimplifiees || [];
  const demarcheNumbers = demarches
    .map((demarche) => demarche.number)
    .filter(Boolean)
    .join(",");

  // Accès de notre jeton DN à chaque démarche et à ses dossiers : sans accès, le job ne peut pas importer les candidatures.
  useEffect(() => {
    if (!demarcheNumbers) {
      return;
    }
    demarcheNumbers.split(",").forEach(async (number) => {
      try {
        const res = await api.get(`/demarches-simplifiees/access?number=${number}`);
        if (res.ok) {
          setAccessByNumber((prev) => ({ ...prev, [number]: res.data }));
        }
      } catch (error) {
        captureError(error, { message: "Erreur lors de la vérification de l'accès à la démarche", extra: { number } });
      }
    });
  }, [demarcheNumbers]);

  const updateDemarche = (index, patch) => {
    const next = demarches.map((demarche, i) => (i === index ? { ...demarche, ...patch } : demarche));
    onChange({ ...values, demarcheSimplifiees: next });
  };

  const addDemarche = () => {
    onChange({ ...values, demarcheSimplifiees: [...demarches, EMPTY_DEMARCHE] });
  };

  const removeDemarche = (index) => {
    onChange({ ...values, demarcheSimplifiees: demarches.filter((_, i) => i !== index) });
  };

  const handleSearch = async (index) => {
    const demarche = demarches[index];
    if (!demarche.url) {
      toast.error("Veuillez renseigner l'URL de la démarche");
      return;
    }
    const isTokenMode = values.demarcheSimplifieeAuthMode === "token";
    // En mode token, la recherche utilise le token enregistré côté API : il doit avoir été validé.
    if (isTokenMode && (values.demarcheSimplifieeToken || !values.hasDemarcheSimplifieeToken)) {
      toast.error("Validez le token avant de chercher la démarche");
      return;
    }
    try {
      setLoadingIndex(index);
      const publisherParam = isTokenMode ? `&publisherId=${values.id}` : "";
      const res = await api.get(`/demarches-simplifiees/resolve?url=${encodeURIComponent(demarche.url)}${publisherParam}`);
      if (!res.ok) {
        toast.error("Démarche introuvable pour cette URL");
        return;
      }
      updateDemarche(index, {
        number: res.data.number,
        name: res.data.name ?? null,
        annotationKey: res.data.annotationKey ?? null,
        fields: res.data.fields,
      });
      toast.success("Démarche trouvée");
    } catch (error) {
      captureError(error, { message: "Erreur lors de la recherche de la démarche", extra: { url: demarche.url } });
    } finally {
      setLoadingIndex(null);
    }
  };

  // Ouvre la démarche comme le fait la redirection d'un clic : l'annotation « Identifiant de la redirection » est préremplie
  // via le query param `annotationKey`. Un identifiant de test est utilisé : aucun clic n'est créé en base.
  const handleTestRedirection = (index) => {
    const demarche = demarches[index];
    const redirectionId = `test-${crypto.randomUUID()}`;
    const url = new URL(demarche.url);
    url.searchParams.set(demarche.annotationKey, redirectionId);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    setRedirectionIdByIndex((prev) => ({ ...prev, [index]: redirectionId }));
  };

  // Rejoue le job d'import sur un dossier réel (lecture seule), avec la config affichée (même non enregistrée).
  const handleCheckDossier = async (index) => {
    const demarche = demarches[index];
    const dossierNumber = checkByIndex[index]?.dossierNumber;
    try {
      setCheckByIndex((prev) => ({ ...prev, [index]: { dossierNumber, loading: true } }));
      const res = await api.post("/demarches-simplifiees/check-dossier", {
        dossierNumber,
        demarcheNumber: demarche.number,
        url: demarche.url ?? null,
        fields: demarche.fields ?? {},
      });
      if (!res.ok) {
        toast.error("Dossier introuvable sur cette démarche (ou jeton sans accès aux dossiers)");
      }
      setCheckByIndex((prev) => ({ ...prev, [index]: { dossierNumber, result: res.ok ? res.data : null } }));
    } catch (error) {
      setCheckByIndex((prev) => ({ ...prev, [index]: { dossierNumber } }));
      captureError(error, { message: "Erreur lors du test du dossier", extra: { dossierNumber } });
    }
  };

  const handleValidateToken = async () => {
    try {
      setLoadingToken(true);
      const res = await api.post("/demarches-simplifiees/token", { publisherId: values.id, token: values.demarcheSimplifieeToken });
      if (!res.ok) {
        toast.error(res.message || "Token invalide");
        return;
      }
      onChange({ ...values, hasDemarcheSimplifieeToken: true, demarcheSimplifieeToken: null });
      setIsEditingToken(false);
      toast.success("Token validé et enregistré");
    } catch (error) {
      captureError(error, { message: "Erreur lors de la validation du token", extra: { publisherId: values.id } });
    } finally {
      setLoadingToken(false);
    }
  };

  const handleCancelTokenChange = () => {
    onChange({ ...values, demarcheSimplifieeToken: null });
    setIsEditingToken(false);
  };

  const showTokenInput = !values.hasDemarcheSimplifieeToken || isEditingToken;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Démarches Simplifiées</h2>
        <Toggle
          aria-label={isDemarcheSimplifiee ? "Désactiver les démarches simplifiées" : "Activer les démarches simplifiées"}
          value={isDemarcheSimplifiee}
          onChange={(e) =>
            onChange({
              ...values,
              isDemarcheSimplifiee: e,
              demarcheSimplifiees: e ? (demarches.length ? demarches : [EMPTY_DEMARCHE]) : [],
            })
          }
        />
      </div>
      {isDemarcheSimplifiee && (
        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 text-base font-bold">Mode de connexion à Démarche Numérique</legend>
            <RadioInput
              id="demarche-simplifiees-auth-account"
              name="demarche-simplifiees-auth-mode"
              value="account"
              label="Compte API Engagement : nous avons été ajoutés à l'organisation du partenaire"
              checked={values.demarcheSimplifieeAuthMode !== "token"}
              onChange={() => onChange({ ...values, demarcheSimplifieeAuthMode: "account", demarcheSimplifieeToken: null })}
            />
            <RadioInput
              id="demarche-simplifiees-auth-token"
              name="demarche-simplifiees-auth-mode"
              value="token"
              label="Token API fourni par le partenaire"
              checked={values.demarcheSimplifieeAuthMode === "token"}
              onChange={() => onChange({ ...values, demarcheSimplifieeAuthMode: "token" })}
            />
          </fieldset>
          {values.demarcheSimplifieeAuthMode === "token" && (
            <div className="flex flex-col gap-2">
              {showTokenInput ? (
                <div className="flex items-end gap-4">
                  <LabelledInput
                    id="demarche-simplifiees-token"
                    label="Token API du partenaire"
                    hint="Vérifié auprès de Démarche Numérique puis enregistré chiffré ; il n'est jamais réaffiché."
                    type="password"
                    autoComplete="off"
                    value={values.demarcheSimplifieeToken ?? ""}
                    onChange={(e) => onChange({ ...values, demarcheSimplifieeToken: e.target.value || null })}
                    error={errors.demarcheSimplifieeToken}
                    required
                    className="w-full"
                  />
                  <button type="button" className="primary-btn shrink-0" disabled={loadingToken || !values.demarcheSimplifieeToken} onClick={handleValidateToken}>
                    {loadingToken ? "Validation..." : "Valider le token"}
                  </button>
                  {values.hasDemarcheSimplifieeToken && (
                    <button type="button" className="tertiary-btn shrink-0" onClick={handleCancelTokenChange}>
                      Annuler
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-end gap-4">
                  {/* Le token n'est jamais renvoyé par l'API : on affiche un masque fixe. */}
                  <LabelledInput
                    id="demarche-simplifiees-token"
                    label="Token API du partenaire"
                    hint="Token vérifié et enregistré chiffré."
                    type="password"
                    value="••••••••••••••••••••••••"
                    readOnly
                    className="w-full"
                  />
                  <button type="button" className="secondary-btn shrink-0" onClick={() => setIsEditingToken(true)}>
                    Changer le token
                  </button>
                </div>
              )}
              <a
                href="https://doc.demarches-simplifiees.fr/api-graphql/jeton-dauthentification"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-france w-fit text-sm underline"
              >
                Comment le partenaire crée son token (documentation Démarche Numérique, nouvel onglet)
              </a>
            </div>
          )}
          {demarches.map((demarche, index) => (
            <div key={index} className="border-grey-border flex flex-col gap-4 border p-4 sm:p-6">
              <div className="flex items-end gap-4">
                <LabelledInput
                  id={`demarche-simplifiees-url-${index}`}
                  label="URL de la démarche"
                  placeholder="https://demarche.numerique.gouv.fr/commencer/..."
                  value={demarche.url ?? ""}
                  onChange={(e) => updateDemarche(index, { ...EMPTY_DEMARCHE, url: e.target.value || null })}
                  className="w-full"
                />
                <button type="button" className="primary-btn" disabled={loadingIndex === index || !demarche.url} onClick={() => handleSearch(index)}>
                  {loadingIndex === index ? "Recherche..." : "Chercher"}
                </button>
                <button type="button" className="text-error ml-auto flex items-center gap-1" aria-label="Supprimer la démarche" onClick={() => removeDemarche(index)}>
                  <RiDeleteBinLine aria-hidden="true" />
                  <span>Supprimer</span>
                </button>
              </div>
              <LabelledInput
                id={`demarche-simplifiees-number-${index}`}
                label="Numéro de la démarche"
                hint="Renseigné automatiquement via « Chercher »."
                value={demarche.number ?? ""}
                readOnly
                className="w-64"
              />
              {accessByNumber[demarche.number] && (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-6 text-sm">
                    {[
                      { label: "Accès à la démarche", hasAccess: accessByNumber[demarche.number].demarche },
                      { label: "Accès aux dossiers (candidatures)", hasAccess: accessByNumber[demarche.number].dossiers },
                    ].map((item) => (
                      <span key={item.label} className="flex items-center gap-1">
                        {item.hasAccess ? <RiCheckboxCircleFill className="text-success" aria-hidden="true" /> : <RiCloseCircleFill className="text-error" aria-hidden="true" />}
                        {item.label} : {item.hasAccess ? "oui" : "non"}
                      </span>
                    ))}
                  </div>
                  {!accessByNumber[demarche.number].dossiers && (
                    <p className="text-text-mention text-sm">
                      Sans accès, les candidatures ne peuvent pas être importées : le compte du jeton API doit être ajouté comme instructeur de la démarche.
                    </p>
                  )}
                </div>
              )}
              <LabelledInput
                id={`demarche-simplifiees-name-${index}`}
                label="Nom de la démarche"
                hint="Renseigné automatiquement via « Chercher »."
                value={demarche.name ?? ""}
                readOnly
                className="w-full"
              />
              <LabelledInput
                id={`demarche-simplifiees-annotation-key-${index}`}
                label="Champ « Identifiant de la redirection »"
                hint="Clé de l'annotation préremplie avec l'identifiant du clic lors de la redirection. Renseignée automatiquement via « Chercher »."
                value={demarche.annotationKey ?? ""}
                readOnly
                className="w-full"
              />
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-bold">Champs candidat</h3>
                  <p className="text-text-mention text-sm">
                    Libellés exacts des champs du formulaire, lus pour enrichir les candidatures. Détectés automatiquement via « Chercher », modifiables si besoin. Une alerte est
                    envoyée si un libellé n'existe plus sur la démarche.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {CANDIDATE_FIELDS.map((field) => (
                    <LabelledInput
                      key={field.type}
                      id={`demarche-simplifiees-${field.type}-${index}`}
                      label={field.label}
                      hint={`Alimente ${field.attribute}.`}
                      value={demarche.fields?.[field.type] ?? ""}
                      onChange={(e) => updateDemarche(index, { fields: { ...demarche.fields, [field.type]: e.target.value || null } })}
                      className="w-full"
                    />
                  ))}
                </div>
              </div>
              {demarche.number && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-bold">Tester la redirection</h3>
                    <p className="text-text-mention text-sm">
                      Ouvre la démarche avec l'annotation « Identifiant de la redirection » préremplie, comme lors d'un clic. Déposez ensuite un dossier puis testez-le ci-dessous :
                      l'identifiant doit y être retrouvé (le clic d'origine, lui, n'existe pas en base pour un test).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <button type="button" className="secondary-btn" disabled={!demarche.url || !demarche.annotationKey} onClick={() => handleTestRedirection(index)}>
                      Ouvrir la démarche
                    </button>
                    {redirectionIdByIndex[index] && <span className="text-sm">Identifiant prérempli : {redirectionIdByIndex[index]}</span>}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Tester un dossier</h3>
                    <p className="text-text-mention text-sm">
                      Rejoue l'import des candidatures sur un dossier, sans rien enregistrer : identifiant de la redirection, clic d'origine et attributs candidat lus avec les
                      champs ci-dessus.
                    </p>
                  </div>
                  <div className="flex items-end gap-4">
                    <LabelledInput
                      id={`demarche-simplifiees-check-dossier-${index}`}
                      label="Numéro du dossier"
                      type="number"
                      value={checkByIndex[index]?.dossierNumber ?? ""}
                      onChange={(e) => setCheckByIndex((prev) => ({ ...prev, [index]: { dossierNumber: e.target.value } }))}
                      className="w-64"
                    />
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={!checkByIndex[index]?.dossierNumber || checkByIndex[index]?.loading}
                      onClick={() => handleCheckDossier(index)}
                    >
                      {checkByIndex[index]?.loading ? "Test..." : "Tester"}
                    </button>
                  </div>
                  {checkByIndex[index]?.result && <DossierCheckResult result={checkByIndex[index].result} />}
                </div>
              )}
            </div>
          ))}
          <button type="button" className="text-blue-france border-blue-france flex w-fit items-center gap-2 border-b" onClick={addDemarche}>
            <RiAddLine aria-hidden="true" />
            <span>Ajouter une démarche</span>
          </button>
        </div>
      )}
    </div>
  );
};

const STATUS_ICONS = {
  success: <RiCheckboxCircleFill className="text-success shrink-0" aria-hidden="true" />,
  warning: <RiErrorWarningFill className="text-warning shrink-0" aria-hidden="true" />,
  error: <RiCloseCircleFill className="text-error shrink-0" aria-hidden="true" />,
};

const DossierCheckResult = ({ result }) => {
  const attributes = Object.entries(result.candidateAttributes);
  const rows = [
    result.dateDepot
      ? { status: "success", text: `Dossier déposé le ${new Date(result.dateDepot).toLocaleDateString("fr-FR")} (${result.state})` }
      : { status: "warning", text: `Dossier non déposé (${result.state}) : il est ignoré par l'import` },
    !result.hasRedirectionAnnotation
      ? { status: "error", text: "Identifiant de la redirection : annotation absente du dossier" }
      : result.redirectionId
        ? { status: "success", text: `Identifiant de la redirection : ${result.redirectionId}` }
        : { status: "warning", text: "Identifiant de la redirection : vide (dossier non issu d'une redirection trackée)" },
    result.redirectionId &&
      !result.redirectionId.startsWith("test-") && {
        status: result.clickFound ? "success" : "error",
        text: result.clickFound ? "Clic d'origine retrouvé en base" : "Clic d'origine introuvable en base",
      },
    result.missingFields.length > 0 && { status: "error", text: `Champs introuvables sur la démarche : ${result.missingFields.join(", ")}` },
    attributes.length
      ? { status: "success", text: `Attributs candidat : ${attributes.map(([key, value]) => `${key} = ${value}`).join(", ")}` }
      : { status: "warning", text: "Aucun attribut candidat extrait" },
  ].filter(Boolean);

  return (
    <ul className="flex flex-col gap-2 text-sm" aria-live="polite">
      {rows.map((row) => (
        <li key={row.text} className="flex items-center gap-2">
          {STATUS_ICONS[row.status]}
          {row.text}
        </li>
      ))}
    </ul>
  );
};

export default DemarcheSimplifiee;
