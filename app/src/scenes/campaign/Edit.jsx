import { useEffect, useState } from "react";
import { AiFillWarning } from "react-icons/ai";
import { RiArrowLeftLine, RiDeleteBin6Line, RiFileTransferLine, RiMoreLine } from "react-icons/ri";
import { Link, useNavigate, useParams } from "react-router-dom";

import { toast } from "../../services/toast";

import Dropdown from "../../components/Dropdown";
import Loader from "../../components/Loader";
import Modal from "../../components/New-Modal";
import SearchSelect from "../../components/SearchSelect";
import Toggle from "../../components/Toggle";
import api from "../../services/api";
import { API_URL } from "../../services/config";
import { captureError } from "../../services/error";
import { isValidUrl } from "../../services/utils";
import { withLegacyPublishers } from "../../utils/publisher";
import Information from "./components/Information";
import Trackers from "./components/Trackers";

const Edit = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [values, setValues] = useState({
    name: "",
    type: "",
    toPublisherId: "",
    url: "",
    trackers: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const trackedLink = `${API_URL}/r/campaign/${id}`;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/campaign/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Campagne non trouvée");
            navigate("/broadcast/campaigns");
            return;
          }
          throw res;
        }
        setCampaign(res.data);
        setValues({ ...values, ...res.data });
      } catch (error) {
        captureError(error, { extra: { id } });
      }
    };
    fetchData();
  }, [id]);

  const handleSubmit = async () => {
    const errors = {};

    if (!values.name) errors.name = "Le nom est requis";
    if (!values.type) errors.type = "Le type de campagne est requis";
    if (!values.toPublisherId) errors.toPublisherId = "Le partenaire est requis";
    if (!values.url) errors.url = "L'url est requis";
    if (!isValidUrl(values.url)) errors.url = "L'url n'est pas valide";

    if (errors.name || errors.type || errors.toPublisherId || errors.url) {
      setErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: values.name,
        type: values.type,
        toPublisherId: values.toPublisherId,
        url: values.url,
        urlSource: values.urlSource || "",
        trackers: values.trackers.filter((t) => t.key && t.value),
      };

      const res = await api.put(`/campaign/${id}`, payload);
      if (!res.ok) {
        if (res.status === 409) return toast.error("Une campagne avec ce nom existe déjà");
        else throw res;
      }
      toast.success("Campagne mise à jour");
      setCampaign(res.data);
      setValues({ ...values, ...res.data });
    } catch (error) {
      captureError(error, { extra: { id, values } });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (activation) => {
    try {
      setValues({ ...values, active: activation });
      const res = await api.put(`/campaign/${id}`, { active: activation });
      if (!res.ok) {
        throw res;
      }
      toast.success(activation ? "Campagne activée" : "Campagne désactivée");
      setCampaign({ ...campaign, active: activation });
    } catch (error) {
      captureError(error, { extra: { id, activation } });
      setValues({ ...values, active: !activation });
    }
  };

  const handleDelete = async () => {
    const res = window.confirm("Êtes-vous sûr de vouloir supprimer cette campagne ?");
    if (!res) return;

    try {
      const res = await api.delete(`/campaign/${id}`);
      if (!res.ok) throw res;
      toast.success("Campagne supprimée");
      navigate("/broadcast/campaigns");
    } catch (error) {
      captureError(error, { extra: { id } });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(trackedLink);
    toast.success("Lien copié");
  };

  const isChanged = (v) =>
    v.name !== campaign.name || v.type !== campaign.type || v.toPublisherId !== campaign.toPublisherId || v.url !== campaign.url || v.urlSource !== campaign.urlSource;
  const isErrors = (e) => e.name || e.toPublisherId || e.url;

  if (!campaign)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <>
      <title>API Engagement - Modifier une campagne de diffusion</title>
      <ReassignModal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        campaign={campaign}
        values={values}
        setValues={setValues}
        setCampaign={setCampaign}
      />
      <div className="flex flex-col gap-8">
        <Link to="/broadcast/campaigns" className="border-blue-france text-blue-france flex w-fit items-center gap-2 border-b text-[16px]">
          <RiArrowLeftLine />
          Retour
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Modifier une campagne</h1>
            <p className="text-text-mention mt-2 text-base">Créée le {new Date(campaign.createdAt).toLocaleDateString("fr")}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Toggle aria-label={values.active ? "Désactiver la campagne" : "Activer la campagne"} value={values.active} onChange={handleArchive} />
              <label className={`${values.active ? "text-blue-france" : "text-text-mention"} mb-1 ml-2`}>{values.active ? "Active" : "Inactive"}</label>
            </div>
            <button className="primary-btn" disabled={!isChanged(values) || isErrors(errors) || loading} onClick={handleSubmit}>
              {loading ? <Loader className="h-6 w-6" /> : "Enregistrer"}
            </button>
            <CampaignMenu setIsReassignModalOpen={setIsReassignModalOpen} handleDelete={handleDelete} />
          </div>
        </div>

        <div className="flex flex-col gap-8 bg-white p-10 shadow-lg">
          <div>
            <h2 className="mb-2 text-3xl font-bold">Paramètres</h2>
            <p className="text-text-mention text-xs">
              Les champs avec <span className="text-red-marianne">*</span> sont requis.
            </p>
          </div>

          <Information values={values} onChange={setValues} errors={errors} onErrorChange={setErrors} />
          <Trackers values={values} onChange={setValues} />

          <div className="flex flex-col">
            <label className="text-sm">Lien à insérer dans le contenu de votre campagne</label>
            <div className="border-blue-france-925 bg-blue-france-975 my-2 flex items-center justify-between border px-4 py-4">
              <span className="truncate text-sm">{trackedLink}</span>
              <button type="button" className="secondary-btn" onClick={handleCopy}>
                Copier
              </button>
            </div>
            <div>
              <span className="text-warning mt-2 flex flex-row items-center text-xs">
                <AiFillWarning className="mr-2" />
                Copiez exactement ce lien !
              </span>
            </div>
          </div>
          <div className="col-span-2 flex justify-end gap-4">
            <button className="primary-btn" disabled={!isChanged(values) || isErrors(errors) || loading} onClick={handleSubmit}>
              {loading ? <Loader className="h-6 w-6" /> : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const CampaignMenu = ({ setIsReassignModalOpen, handleDelete }) => {
  return (
    <Dropdown
      renderTrigger={({ onClick }) => (
        <button className="tertiary-btn flex items-center" onClick={onClick}>
          <RiMoreLine className="text-xl" />
        </button>
      )}
      position="bottom"
      align="end"
    >
      <ul className="p-1">
        <li>
          <button className="dropdown-btn w-full" onClick={() => setIsReassignModalOpen(true)}>
            <RiFileTransferLine />
            <span>Déplacer</span>
          </button>
        </li>
        <li>
          <button className="dropdown-red-btn w-full" onClick={handleDelete}>
            <RiDeleteBin6Line />
            <span>Supprimer</span>
          </button>
        </li>
      </ul>
    </Dropdown>
  );
};

const ReassignModal = ({ isOpen, onClose, campaign, values, setValues, setCampaign }) => {
  const navigate = useNavigate();
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post(`/publisher/search`, { role: "campaign" });
        if (!res.ok) throw res;
        setPublishers(
          withLegacyPublishers(res.data)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => ({ ...p, label: p.name })),
        );
      } catch (error) {
        captureError(error);
      }
    };
    fetchData();
  }, []);

  const handleReassignSubmit = async () => {
    setLoading(true);
    try {
      if (!values.fromPublisherId) {
        toast.error("Veuillez sélectionner un partenaire");
        setLoading(false);
        return;
      }
      const res = await api.put(`/campaign/${campaign.id}/reassign`, {
        fromPublisherId: values.fromPublisherId,
      });

      if (!res.ok) throw res;
      toast.success("Campagne déplacée avec succès");
      setCampaign({ ...campaign, toPublisherId: values.toPublisherId });
      onClose();
      navigate("/broadcast/campaigns");
    } catch (error) {
      captureError(error, { extra: { campaign, values } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} innerClassName="w-full">
      <div className="p-10">
        <div className="mb-8 flex items-center gap-3">
          <RiFileTransferLine className="text-3xl" />
          <h2 className="text-3xl font-bold">Déplacer une campagne</h2>
        </div>
        <span className="text-text-mention">
          Vers quel compte voulez-vous déplacer la campagne <span className="font-bold">{campaign.name}</span> ?
        </span>
        <div className="mt-8 flex flex-1 gap-2">
          <SearchSelect
            options={publishers.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Sélectionner un compte"
            value={values.fromPublisherId}
            onChange={(e) => setValues({ ...values, fromPublisherId: e.value })}
          />
        </div>
        <div className="mt-10 flex justify-end gap-2">
          <button className="tertiary-btn" type="button" onClick={onClose}>
            Annuler
          </button>
          <button
            className="primary-btn"
            type="submit"
            onClick={handleReassignSubmit}
            disabled={!values.fromPublisherId || values.fromPublisherId === campaign.fromPublisherId || loading}
          >
            {loading ? <Loader className="h-6 w-6" /> : "Valider"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default Edit;
