import { toast } from "@/services/toast";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AnnonceurCreation from "@/scenes/publisher/components/AnnonceurCreation";
import DeploymentUser from "@/scenes/publisher/components/DeploymentUser";
import DiffuseurCreation from "@/scenes/publisher/components/DiffuseurCreation";
import Informations from "@/scenes/publisher/components/Informations";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { buildPublisherPayload, validatePublisher } from "@/utils/publisher";
import { RiArrowLeftLine, RiErrorWarningFill } from "react-icons/ri";

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
    selfHostedScript: false,
    isDiffuseur: false, // No in the model
    missionType: null,
    expectedApplications: null,
    deploymentUserId: null,
    category: null,
    hasApiRights: false,
    hasWidgetRights: false,
    hasCampaignRights: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [duplicateName, setDuplicateName] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validatePublisher(values)).length > 0) {
      toast.error("Le formulaire contient des erreurs. Veuillez les corriger.");
      return;
    }
    try {
      const payload = buildPublisherPayload(values);
      const res = await api.post(`/publisher/`, payload);
      if (res.status === 409) {
        setDuplicateName(values.name);
        toast.error("Le nom du partenaire existe déjà. Veuillez choisir un autre nom.");
        return;
      }
      if (!res.ok) {
        throw res;
      }
      toast.success("Partenaire créé avec succès");
      navigate(`/publisher/${res.data.id}`);
    } catch (error) {
      captureError(error, { message: "Erreur lors de la création du partenaire", extra: { values } });
    }
  };

  const errors = submitted ? validatePublisher(values) : {};
  if (values.name === duplicateName) {
    errors.name = "Un partenaire avec ce nom existe déjà (éventuellement supprimé). Veuillez choisir un autre nom.";
  }

  return (
    <div className="flex flex-col gap-8">
      <title>API Engagement - Nouveau compte partenaire</title>
      <Link to="/admin-account/publishers" className="border-blue-france text-blue-france flex w-fit items-center gap-2 border-b text-[16px]">
        <RiArrowLeftLine aria-hidden="true" />
        Retour
      </Link>
      <h1 className="text-4xl font-bold">Nouveau compte partenaire</h1>
      <div className="space-y-12 bg-white p-4 shadow-lg sm:p-12">
        <p className="text-text-mention text-sm">
          <span className="text-error" aria-hidden="true">
            *
          </span>{" "}
          : champ obligatoire
        </p>
        <Informations values={values} onChange={setValues} errors={errors} />
        <div className="h-px w-full bg-gray-900" />
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Paramètres</h2>
          <p className="text-text-mention text-sm">Le partenaire doit être annonceur, diffuseur, ou les deux.</p>
          {errors.settings && (
            <p id="settings-error" className="text-error flex items-center text-sm" aria-live="polite">
              <RiErrorWarningFill className="mr-2" aria-hidden="true" />
              {errors.settings}
            </p>
          )}
          <DeploymentUser value={values.deploymentUserId} onChange={(deploymentUserId) => setValues({ ...values, deploymentUserId })} />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex-1">
              <AnnonceurCreation values={values} onChange={setValues} errors={errors} />
            </div>
            <div className="flex-1">
              <DiffuseurCreation values={values} onChange={setValues} errors={errors} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button className="primary-btn" onClick={handleSubmit}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default Create;
