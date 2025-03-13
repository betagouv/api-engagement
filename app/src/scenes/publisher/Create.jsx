import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../services/api";
import { captureError } from "../../services/error";
import Informations from "./components/Informations";
import SettingsCreation from "./components/SettingsCreation";

const canSubmit = (values) => {
  if (values.name === "") return false;
  if (!(values.role_annonceur_api || values.role_annonceur_campagne || values.role_annonceur_widget) && !values.role_promoteur) return false;
  if ((values.role_annonceur_api || values.role_annonceur_campagne || values.role_annonceur_widget) && !values.category) return false;
  if (values.role_promoteur && !values.mission_type) return false;
  return true;
};

const Create = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: "",
    email: "",
    url: "",
    documentation: "",
    description: "",
    role_annonceur_api: false,
    role_annonceur_campagne: false,
    role_annonceur_widget: false,
    role_promoteur: false,
    mission_type: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/publisher/`, values);
      if (!res.ok) throw res;
      toast.success("Partenaire créé avec succès");
      navigate(`/publisher/${res.data._id}`);
    } catch (error) {
      captureError(error, "Erreur lors de la création du partenaire");
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-10 flex items-center">
        <div className="ml-8 pt-2">
          <h1 className="text-4xl font-bold">Nouveau compte partenaire</h1>
        </div>
      </div>
      <div className="bg-white p-12 space-y-12 shadow-lg">
        <Informations values={values} onChange={setValues} disabled={false} />
        <div className="w-full h-px bg-gray-border" />
        <SettingsCreation values={values} onChange={setValues} onSave={setValues} />

        <div className="flex items-center justify-end gap-2">
          <button className="filled-button" disabled={!canSubmit(values)} onClick={handleSubmit}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default Create;
