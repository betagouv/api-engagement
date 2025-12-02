import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { RiArrowLeftLine } from "react-icons/ri";
import api from "../../services/api";
import { captureError } from "../../services/error";
import { buildPublisherPayload } from "../../utils/publisher";
import AnnonceurCreation from "./components/AnnonceurCreation";
import DiffuseurCreation from "./components/DiffuseurCreation";
import Informations from "./components/Informations";

const canSubmit = (values) => {
  if (values.name === "") return false;
  if (!values.isDiffuseur && !values.isAnnonceur) return false;
  if (values.isDiffuseur && !(values.hasApiRights || values.hasWidgetRights || values.hasCampaignRights)) return false;
  if (values.isDiffuseur && !values.category) return false;
  if (values.isAnnonceur && !values.missionType) return false;
  return true;
};

const Create = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    publishers: [],
    sendReportTo: [],
    sendReport: false,
    description: "",
    lead: "",
    url: "",
    email: "",
    documentation: "",
    name: "",
    isAnnonceur: false,
    isDiffuseur: false, // No in the model
    missionType: null,
    category: null,
    hasApiRights: false,
    hasWidgetRights: false,
    hasCampaignRights: false,
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = buildPublisherPayload(values);
      const res = await api.post(`/publisher/`, payload);
      if (!res.ok) {
        throw res;
      }
      toast.success("Partenaire créé avec succès");
      navigate(`/publisher/${res.data.id}`);
    } catch (error) {
      captureError(error, "Erreur lors de la création du partenaire");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Link to="/admin-account/publishers" className="border-blue-france text-blue-france flex w-fit items-center gap-2 border-b text-[16px]">
        <RiArrowLeftLine />
        Retour
      </Link>
      <h1 className="text-4xl font-bold">Nouveau compte partenaire</h1>
      <div className="space-y-12 bg-white p-12 shadow-lg">
        <Informations values={values} onChange={setValues} />
        <div className="h-px w-full bg-gray-900" />
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Paramètres</h2>
          {errors.settings && <p className="text-red-700">{errors.settings}</p>}
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <AnnonceurCreation values={values} onChange={setValues} errors={errors} setErrors={setErrors} />
            </div>
            <div className="flex-1">
              <DiffuseurCreation values={values} onChange={setValues} errors={errors} setErrors={setErrors} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button className="primary-btn" disabled={!canSubmit(values)} onClick={handleSubmit}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default Create;
