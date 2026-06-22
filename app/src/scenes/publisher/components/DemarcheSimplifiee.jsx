import { useState } from "react";
import { RiAddLine, RiDeleteBinLine } from "react-icons/ri";

import LabelledInput from "@/components/form/LabelledInput";
import Toggle from "@/components/Toggle";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { toast } from "@/services/toast";

const DemarcheSimplifiee = ({ values, onChange }) => {
  const [loadingIndex, setLoadingIndex] = useState(null);
  const { isDemarcheSimplifiee } = values;
  const demarches = values.demarcheSimplifiees || [];

  const updateDemarche = (index, patch) => {
    const next = demarches.map((demarche, i) => (i === index ? { ...demarche, ...patch } : demarche));
    onChange({ ...values, demarcheSimplifiees: next });
  };

  const addDemarche = () => {
    onChange({ ...values, demarcheSimplifiees: [...demarches, { number: null, name: null, url: null, annotationKey: null }] });
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
      updateDemarche(index, { number: res.data.number, name: res.data.name ?? null, annotationKey: res.data.annotationKey ?? null });
      toast.success("Démarche trouvée");
    } catch (error) {
      captureError(error, { extra: { url: demarche.url } });
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
              demarcheSimplifiees: e ? (demarches.length ? demarches : [{ number: null, name: null, url: null, annotationKey: null }]) : [],
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
                  onChange={(e) => updateDemarche(index, { url: e.target.value || null, number: null, name: null, annotationKey: null })}
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
