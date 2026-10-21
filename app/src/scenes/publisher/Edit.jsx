import { toast } from "@/services/toast";
import _ from "lodash";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import TrashSvg from "@/assets/svg/trash-icon.svg?react";
import Loader from "@/components/Loader";
import Administration from "@/scenes/publisher/components/Administration";
import DemarcheSimplifiee from "@/scenes/publisher/components/DemarcheSimplifiee";
import DeploymentUser from "@/scenes/publisher/components/DeploymentUser";
import Informations from "@/scenes/publisher/components/Informations";
import Members from "@/scenes/publisher/components/Members";
import StickyBar from "@/scenes/publisher/components/StickyBar";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { buildPublisherPayload, validatePublisher, withLegacyPublisher } from "@/utils/publisher";
import { RiArrowLeftLine, RiErrorWarningFill } from "react-icons/ri";
import Annonceur from "./components/Annonceur";
import Diffuseur from "./components/Diffuseur";

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
    expectedApplications: null,
    deploymentUserId: null,
    category: null,
    isAnnonceur: false,
    selfHostedScript: false,
    isDiffuseur: false,
    hasApiRights: false,
    hasWidgetRights: false,
    hasCampaignRights: false,
    isDemarcheSimplifiee: false,
    demarcheSimplifiees: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [saveButton, setSaveButton] = useState(null);

  useEffect(() => {
    if (!saveButton) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(saveButton);

    return () => observer.unobserve(saveButton);
  }, [saveButton]);

  useEffect(() => {
    if (!publisher) {
      return;
    }
    setValues({
      ...values,
      ...publisher,
      isDiffuseur: publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights || false,
      isDemarcheSimplifiee: (publisher.demarcheSimplifiees || []).length > 0,
    });
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
        const normalized = withLegacyPublisher(res.data);
        setPublisher(normalized);
      } catch (error) {
        captureError(error, { message: "Erreur lors du chargement du partenaire", extra: { id } });
      }
    };
    fetchData();
  }, [id]);

  const handleFileChange = async (e) => {
    try {
      const formData = new FormData();
      formData.append("files", e.target.files[0]);
      const res = await api.postFormData(`/publisher/${id}/image`, formData);
      if (!res.ok) {
        throw res;
      }
      toast.success("Image mise à jour");
      const updated = withLegacyPublisher(res.data);
      setValues(updated);
      setPublisher(updated);
      if (sessionPublisher?.id === values.id) {
        setSessionPublisher(updated);
      }
    } catch (error) {
      captureError(error, { message: "Erreur lors de la mise à jour de l'image", extra: { id } });
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Etes vous sur ?");
    if (!confirm) {
      return;
    }

    try {
      const res = await api.delete(`/publisher/${values.id}`);
      if (!res.ok) {
        throw res;
      }
      toast.success("Partenaire supprimé");

      if (sessionPublisher?.id === values.id) {
        const res = await api.get(`/publisher/${user.publishers[0]}`);
        if (!res.ok) {
          throw res;
        }
        setSessionPublisher(withLegacyPublisher(res.data));
      }
      navigate("/accounts?tab=publishers");
    } catch (error) {
      captureError(error, { message: "Erreur lors de la suppression du partenaire", extra: { id } });
    }
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (Object.keys(validatePublisher(values)).length > 0) {
      toast.error("Le formulaire contient des erreurs. Veuillez les corriger.");
      return;
    }
    try {
      const payload = buildPublisherPayload(values);

      const res = await api.put(`/publisher/${id}`, payload);
      if (!res.ok) {
        throw res;
      }
      toast.success("Partenaire mis à jour");
      const updated = withLegacyPublisher(res.data);
      setPublisher(updated);
      if (sessionPublisher?.id === values.id) {
        setSessionPublisher(updated);
      }
    } catch (error) {
      captureError(error, { message: "Erreur lors de la mise à jour du partenaire", extra: { id, values } });
    }
  };

  const isChanged = (v) => !_.isEqual(v, publisher);
  const errors = submitted ? validatePublisher(values) : {};

  if (!publisher || !values.id) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <title>{`API Engagement - Compte partenaire - ${values.name}`}</title>
      <StickyBar visible={stickyVisible} title={values.name} onSubmit={handleSubmit} disabled={!isChanged(values)} />
      <Link to="/admin-account/publishers" className="border-blue-france text-blue-france flex w-fit items-center gap-2 border-b text-[16px]">
        <RiArrowLeftLine aria-hidden="true" />
        Retour
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label
          htmlFor="logo"
          className="flex h-24 w-32 shrink-0 cursor-pointer flex-col items-center justify-center bg-white p-2 shadow-lg transition-all duration-500 hover:bg-gray-900/10"
        >
          <span className="sr-only">Modifier le logo de {values.name}</span>
          <img src={`${[publisher.logo]}?${Date.now()}`} className="object-scale-down" alt="" aria-hidden="true" />
        </label>
        <input id="logo" accept=".gif,.jpg,.jpeg,.png" type="file" hidden onChange={handleFileChange} />

        <div className="pt-2 sm:ml-8">
          <h1 className="text-4xl font-bold">Compte partenaire de {values.name}</h1>
        </div>
        <button className="primary-btn sm:ml-auto" disabled={!isChanged(values)} onClick={handleSubmit} ref={(node) => setSaveButton(node)}>
          Enregistrer
        </button>
      </div>
      <div className="flex flex-col gap-12 bg-white p-4 shadow-lg sm:p-12">
        <p className="text-text-mention text-sm">
          <span className="text-error" aria-hidden="true">
            *
          </span>{" "}
          : champ obligatoire
        </p>
        <Informations values={values} onChange={setValues} errors={errors} />
        <div className="h-px w-full bg-gray-900" />
        <div className="flex w-full flex-col gap-6">
          <h2 className="text-3xl font-bold">Paramètres</h2>
          <p className="text-text-mention text-sm">Le partenaire doit être annonceur, diffuseur, ou les deux.</p>
          {errors.settings && (
            <p id="settings-error" className="text-error flex items-center text-sm" aria-live="polite">
              <RiErrorWarningFill className="mr-2" aria-hidden="true" />
              {errors.settings}
            </p>
          )}
          <DeploymentUser value={values.deploymentUserId} onChange={(deploymentUserId) => setValues({ ...values, deploymentUserId })} />
          <div className="flex flex-col items-start gap-6 lg:flex-row">
            <Annonceur values={values} onChange={setValues} errors={errors} />
            <Diffuseur values={values} onChange={setValues} errors={errors} />
          </div>
        </div>
        <div className="h-px w-full bg-gray-900" />
        <DemarcheSimplifiee values={values} onChange={setValues} />
        <div className="h-px w-full bg-gray-900" />
        <Administration values={values} onChange={setValues} />
        <div className="h-px w-full bg-gray-900" />
        <Members values={values} onChange={setValues} />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button className="red-btn flex items-center" onClick={handleDelete}>
            <TrashSvg className="mr-2" aria-hidden="true" />
            <span>Supprimer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Edit;
