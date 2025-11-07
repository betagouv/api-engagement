import _ from "lodash";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import TrashSvg from "../../assets/svg/trash-icon.svg?react";
import Loader from "../../components/Loader";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import Administration from "./components/Administration";
import Annonceur from "./components/Annonceur";
import Diffuseur from "./components/Diffuseur";
import Informations from "./components/Informations";
import Members from "./components/Members";
import { buildPublisherPayload } from "./utils";

const Edit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, publisher: sessionPublisher, setPublisher: setSessionPublisher } = useStore();
  const [publisher, setPublisher] = useState(null);
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
    missionType: null,
    category: null,
    isAnnonceur: false,
    isDiffuseur: false,
    hasApiRights: false,
    hasWidgetRights: false,
    hasCampaignRights: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!publisher) return;
    setValues({ ...values, ...publisher, isDiffuseur: publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights || false });
  }, [publisher]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/publisher/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Partenaire non trouvé");
            navigate("/admin-account/publishers");
            return;
          }
          throw res;
        }
        setPublisher(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération du partenaire");
      }
    };
    fetchData();
  }, [id]);

  const handleFileChange = async (e) => {
    try {
      const formData = new FormData();
      formData.append("files", e.target.files[0]);
      const res = await api.postFormData(`/publisher/${id}/image`, formData);
      if (!res.ok) throw res;
      toast.success("Image mise à jour");
      setValues(res.data);
      setPublisher(res.data);
      if (sessionPublisher.id === values.id) setSessionPublisher(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour de l'image");
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Etes vous sur ?");
    if (!confirm) return;

    try {
      const res = await api.delete(`/publisher/${values.id}`);
      if (!res.ok) throw res;
      toast.success("Partenaire supprimé");

      if (sessionPublisher.id === values.id) {
        const res = await api.get(`/publisher/${user.publishers[0]}`);
        if (!res.ok) throw res;
        setSessionPublisher(publisher);
      }
      navigate("/accounts?tab=publishers");
    } catch (error) {
      captureError(error, "Erreur lors de la suppression du partenaire");
    }
  };

  const handleSubmit = async () => {
    try {
      const errors = {};
      if (!values.isAnnonceur && !values.isDiffuseur) {
        errors.settings = "Le partenaire doit être “Annonceur” ou “Diffuseur”. Veuillez cocher une des options dans le formulaire";
      }
      if (values.isAnnonceur && !values.missionType) {
        errors.missionType = "Le partenaire est “Annonceur”. Veuillez sélectionner la catégorie dans le formulaire.";
      }
      if (values.isDiffuseur && !values.category) {
        errors.category = "Le partenaire est “Diffuseur”. Veuillez sélectionner la catégorie dans le formulaire.";
      }
      if (values.isDiffuseur && !values.hasApiRights && !values.hasWidgetRights && !values.hasCampaignRights) {
        errors.mode = "Le partenaire est “Diffuseur”. Veuillez sélectionner au moins un “moyen de diffusion” dans le formulaire.";
      }

      if (Object.keys(errors).length > 0) {
        toast.error(errors.settings || errors.missionType || errors.category);
        setErrors(errors);
        return;
      }

      const payload = buildPublisherPayload(values);

      const res = await api.put(`/publisher/${id}`, payload);
      if (!res.ok) {
        throw res;
      }
      toast.success("Partenaire mis à jour");
      setPublisher(res.data);
      if (sessionPublisher.id === values.id) {
        setSessionPublisher(res.data);
      }
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour du partenaire");
    }
  };

  const isChanged = (v) => !_.isEqual(v, publisher);

  if (!publisher || !values.id)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="flex flex-col">
      <div className="mb-10 flex items-center">
        <label
          htmlFor="logo"
          className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center bg-white p-2 shadow-lg transition-all duration-500 hover:bg-gray-900/10"
        >
          <img src={`${[publisher.logo]}?${Date.now()}`} className="object-scale-down" />
        </label>
        <input id="logo" accept=".gif,.jpg,.jpeg,.png" type="file" hidden onChange={handleFileChange} />

        <div className="ml-8 pt-2">
          <h1 className="text-4xl font-bold">Compte partenaire de {values.name}</h1>
        </div>
      </div>
      <div className="space-y-12 bg-white p-12 shadow-lg">
        <Informations values={values} onChange={setValues} />
        <div className="h-px w-full bg-gray-900" />
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Paramètres</h2>
          {errors.settings && <p className="text-red-700">{errors.settings}</p>}
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <Annonceur values={values} onChange={setValues} errors={errors} setErrors={setErrors} />
            </div>
            <div className="flex-1">
              <Diffuseur values={values} onChange={setValues} errors={errors} setErrors={setErrors} />
            </div>
          </div>
        </div>
        <div className="h-px w-full bg-gray-900" />
        <Administration values={values} onChange={setValues} />
        <div className="h-px w-full bg-gray-900" />
        <Members values={values} onChange={setValues} />

        <div className="flex items-center justify-end gap-2">
          <button className="red-btn flex items-center" onClick={handleDelete}>
            <TrashSvg className="mr-2" />
            <span>Supprimer</span>
          </button>

          <button className="primary-btn" disabled={!isChanged(values)} onClick={handleSubmit}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default Edit;
