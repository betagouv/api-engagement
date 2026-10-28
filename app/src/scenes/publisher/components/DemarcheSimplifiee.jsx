import { useEffect, useState } from "react";
import { RiAddLine, RiCheckboxCircleFill, RiCloseCircleFill, RiDeleteBinLine } from "react-icons/ri";

import LabelledInput from "@/components/form/LabelledInput";
import Toggle from "@/components/Toggle";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { toast } from "@/services/toast";

const EMPTY_DEMARCHE = {
  number: null,
  name: null,
  url: null,
  annotationKey: null,
  birthDateField: null,
  countryField: null,
  postalCodeField: null,
};

// Champs du formulaire DN lus par le job d'import pour enrichir les candidatures (customAttributes candidate*).
const CANDIDATE_FIELDS = [
  { key: "birthDateField", label: "Champ « Date de naissance »", attribute: "candidateAge" },
  { key: "countryField", label: "Champ « Pays »", attribute: "candidateCountry" },
  { key: "postalCodeField", label: "Champ « Code postal »", attribute: "candidatePostalCode" },
];

const DemarcheSimplifiee = ({ values, onChange }) => {
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [accessByNumber, setAccessByNumber] = useState({});
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
    try {
      setLoadingIndex(index);
      const res = await api.get(`/demarches-simplifiees/resolve?url=${encodeURIComponent(demarche.url)}`);
      if (!res.ok) {
        toast.error("Démarche introuvable pour cette URL");
        return;
      }
      updateDemarche(index, {
        number: res.data.number,
        name: res.data.name ?? null,
        annotationKey: res.data.annotationKey ?? null,
        birthDateField: res.data.birthDateField ?? null,
        countryField: res.data.countryField ?? null,
        postalCodeField: res.data.postalCodeField ?? null,
      });
      toast.success("Démarche trouvée");
    } catch (error) {
      captureError(error, { message: "Erreur lors de la recherche de la démarche", extra: { url: demarche.url } });
    } finally {
      setLoadingIndex(null);
    }
  };

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
                      key={field.key}
                      id={`demarche-simplifiees-${field.key}-${index}`}
                      label={field.label}
                      hint={`Alimente ${field.attribute}.`}
                      value={demarche[field.key] ?? ""}
                      onChange={(e) => updateDemarche(index, { [field.key]: e.target.value || null })}
                      className="w-full"
                    />
                  ))}
                </div>
              </div>
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

export default DemarcheSimplifiee;
