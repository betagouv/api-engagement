import { useEffect, useState } from "react";
import { AiFillWarning } from "react-icons/ai";
import { BiSolidInfoSquare } from "react-icons/bi";
import { RiDeleteBin6Line, RiErrorWarningFill, RiFileTransferLine } from "react-icons/ri";
import { Link, useNavigate, useParams } from "react-router-dom";

import { toast } from "react-toastify";

import Loader from "../../components/Loader";
import Modal from "../../components/New-Modal";
import SearchSelect from "../../components/SearchSelect";
import Toggle from "../../components/Toggle";
import WarningAlert from "../../components/WarningAlert";
import api from "../../services/api";
import { API_URL } from "../../services/config";
import { captureError } from "../../services/error";
import { isValidUrl } from "../../services/utils";
import { withLegacyPublishers } from "../../utils/publisher";

const Edit = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [tracking, setTracking] = useState(false);

  const [values, setValues] = useState({
    name: "",
    type: "",
    toPublisherId: "",
    url: "",
    trackers: [],
  });
  const [errors, setErrors] = useState({});
  const [publishers, setPublishers] = useState([]);
  const [activated, setActivated] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const trackedLink = `${API_URL}/r/campaign/${id}`;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post(`/publisher/search`, { role: "annonceur" });
        if (!res.ok) throw new Error("Erreur lors de la récupération des données");
        setPublishers(
          withLegacyPublishers(res.data)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => ({ ...p, label: p.name })),
        );
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
        navigate("/broadcast");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/campaign/${id}`);
        if (!res.ok) throw new Error("Erreur lors de la récupération des données");
        if (res.data.type === "tuile/bouton") setTracking(true);
        setCampaign(res.data);
        setValues({ ...values, ...res.data });
        setActivated(!res.data.deleted);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
        navigate("/broadcast");
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!campaign) return;
      try {
        const resC = await api.post(`/stats/search`, { type: "click", sourceId: id, size: 1, fromPublisherId: campaign.fromPublisherId });
        if (!resC.ok) throw resC;

        const resI = await api.post(`/stats/search`, { type: "print", sourceId: id, size: 1, fromPublisherId: campaign.fromPublisherId });
        if (!resI.ok) throw resI;

        if ((resC.data?.length || 0) > 0 && (resI.data?.length || 0) === 0) setTracking(true);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
    };
    fetchData();
  }, [campaign]);

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
      const payload = {
        name: values.name,
        type: values.type,
        toPublisherId: values.toPublisherId,
        url: values.url,
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
      captureError(error, "Erreur lors de la mise à jour de la campagne");
    }
  };

  const handleArchive = async (activation) => {
    try {
      const res = await api.put(`/campaign/${id}`, { deleted: !activation });
      if (!res.ok) {
        if (res.status === 409) return toast.error("Une campagne avec ce nom existe déjà");
        else throw res;
      }
      setActivated(activation);
      toast.success(activation ? "Campagne activée" : "Campagne désactivée");
      setCampaign(res.data);
    } catch (error) {
      captureError(error, `Erreur lors de la mise à jour de la campagne`);
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
      captureError(error, "Erreur lors de la suppression de la campagne");
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    const trackers = url.includes("?")
      ? url
          .split("?")[1]
          .split("&")
          .map((t) => ({ key: t.split("=")[0], value: t.split("=")[1] || "" }))
      : [];
    setValues({ ...values, url, trackers });
  };

  const handleTrackerKeyChange = (e, i) => {
    const trackers = [...values.trackers];
    const query = new URLSearchParams();
    trackers.forEach((t, j) => (i === j ? query.append(e.target.value, trackers[i].value) : query.append(t.key, t.value)));
    const url = `${values.url.split("?")[0]}?${query.toString()}`;
    trackers[i].key = e.target.value;
    setValues({ ...values, url, trackers });
  };

  const handleTrackerValueChange = (e, i) => {
    const trackers = [...values.trackers];
    const query = new URLSearchParams();
    trackers.forEach((t) => query.append(t.key, t.value || ""));
    query.set(trackers[i].key, e.target.value);
    const url = `${values.url.split("?")[0]}?${query.toString()}`;
    trackers[i].value = e.target.value;
    setValues({ ...values, url, trackers });
  };

  const handleDeleteTracker = (i) => {
    const query = new URLSearchParams();
    values.trackers.forEach((t, j) => (i === j ? null : query.append(t.key, t.value || "")));
    const url = `${values.url.split("?")[0]}?${query.toString()}`;
    setValues({ ...values, url, trackers: values.trackers.filter((t, j) => j !== i) });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(trackedLink);
    toast.success("Lien copié");
  };

  const isChanged = (v) => v.name !== campaign.name || v.type !== campaign.type || v.toPublisherId !== campaign.toPublisherId || v.url !== campaign.url;
  const isErrors = (e) => e.name || e.toPublisherId || e.url;

  if (!campaign) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-12">
      <ReassignModal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        campaign={campaign}
        values={values}
        setValues={setValues}
        setCampaign={setCampaign}
      />

      <h1 className="text-4xl font-bold">Modifier votre campagne</h1>

      <div className="space-y-12 bg-white p-12">
        <div className="flex justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Paramétrez votre campagne</h2>
            <span>Créée le {new Date(campaign.createdAt).toLocaleDateString("fr")}</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="secondary-btn flex items-center" onClick={() => setIsReassignModalOpen(true)}>
              <RiFileTransferLine className="mr-2" />
              <span>Déplacer</span>
            </button>
            <button className="red-btn flex items-center" onClick={handleDelete}>
              <RiDeleteBin6Line className="mr-2" />
              <span>Supprimer</span>
            </button>
            <div className="flex items-center">
              <Toggle value={activated} onChange={handleArchive} />
              <label className="text-blue-france ml-2">{activated ? "Activée" : "Désactivée"}</label>
            </div>
          </div>
        </div>

        {tracking && (
          <WarningAlert onClose={() => setTracking(false)}>
            <p className="text-xl font-bold">Il semblerait que les impressions de cette campagne ne soient pas comptabilisées</p>
            <p className="text-sm text-[#3a3a3a]">
              Pour vous assurer de bien comptabiliser les impressions de cette campagne,{" "}
              <Link className="link" to={`/announce/settings`}>
                rendez-vous dans la page paramètres
              </Link>
            </p>
          </WarningAlert>
        )}

        <div className="flex flex-col gap-8">
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="name">
              Nom de la campagne
            </label>
            <input
              className={`input mb-2 ${errors.name ? "border-b-red-error" : "border-b-black"}`}
              id="name"
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
            {errors.name && (
              <div className="text-red-error flex items-center text-sm">
                <RiErrorWarningFill className="mr-2" />
                {errors.name}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 flex-col">
              <label className="mb-2 text-sm" htmlFor="type">
                Type de campagne
              </label>
              <select
                id="type"
                className={`input ${errors.type ? "border-b-red-error" : "border-b-black"}`}
                value={values.type}
                onChange={(e) => {
                  setValues({ ...values, type: e.target.value });
                  setErrors({ ...errors, type: "" });
                }}
              >
                <option value="">Sélectionner un type</option>
                <option value="AD_BANNER">Bannière/publicité</option>
                <option value="MAILING">Mailing</option>
                <option value="TILE_BUTTON">Tuile/Bouton</option>
                <option value="OTHER">Autre</option>
              </select>
              {errors.type && (
                <div className="text-red-error flex items-center text-sm">
                  <RiErrorWarningFill className="mr-2" />
                  {errors.type}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <label className="mb-2 text-sm" htmlFor="to-publisher-id">
                Diffuse les missions de
              </label>
              <SearchSelect
                id="to-publisher-id"
                options={publishers.map((e) => ({ value: e.id, label: e.name }))}
                value={values.toPublisherId}
                onChange={(e) => setValues({ ...values, toPublisherId: e.value })}
              />

              {errors.toPublisherId && (
                <div className="text-red-error flex items-center text-sm">
                  <RiErrorWarningFill className="mr-2" />
                  {errors.toPublisherId}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="mb-2 flex items-center text-sm" htmlFor="url">
              Lien de la page web de la campagne
            </label>
            <input id="url" className={`input mb-2 ${errors.url ? "border-b-red-error" : "border-b-black"}`} name="url" value={values.url} onChange={(e) => handleUrlChange(e)} />
            {errors.url && (
              <div className="text-red-error flex items-center text-sm">
                <RiErrorWarningFill className="mr-2" />
                {errors.url}
              </div>
            )}
            <span className="text-blue-info-425 flex items-center text-xs">
              <BiSolidInfoSquare className="mr-2 text-sm" />
              <p>Lien de la page à laquelle les utilisateurs accèderont</p>
            </span>
          </div>
          <div className="flex items-center">
            <Toggle
              value={values.trackers && values.trackers.length > 0}
              onChange={(v) => {
                if (v) setValues({ ...values, trackers: [{ key: "", value: "" }] });
                else setValues({ ...values, trackers: [], url: values.url.split("?")[0] });
              }}
            />
            <label className="ml-2 text-base">Ajouter des paramètres pour le suivi statistique</label>
          </div>
          {values.trackers && values.trackers.length > 0 && (
            <div className="border border-gray-900 p-8">
              <div className="mb-2 flex items-center gap-4">
                <label className="flex-1 text-base">Nom du paramètre</label>
                <label className="flex-1 text-base">Valeur du paramètre</label>
                <div className="w-10" />
              </div>
              <div className="space-y-4">
                {values.trackers.map((tracker, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex-1">
                      <input className="input w-full" name="key" value={tracker.key} onChange={(e) => handleTrackerKeyChange(e, i)} placeholder="Exemple : utm_source" />
                    </div>
                    <div className="flex-1">
                      <input
                        className="input w-full"
                        name="value"
                        value={tracker.value}
                        onChange={(e) => handleTrackerValueChange(e, i)}
                        placeholder="Exemples : google, newsletter"
                      />
                    </div>
                    <div className="flex w-10 justify-end">
                      {values.trackers.length > 1 && (
                        <button type="button" className="tertiary-btn" onClick={() => handleDeleteTracker(i)}>
                          <RiDeleteBin6Line className="text-red-error" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="secondary-btn mt-4" onClick={() => setValues({ ...values, trackers: [...values.trackers, { key: "", value: "" }] })}>
                Ajouter un tracker
              </button>
            </div>
          )}

          <div className="flex flex-col">
            <label className="text-sm">Lien à insérer dans le contenu de votre campagne</label>
            <div className="border-blue-france-925 bg-blue-france-975 my-2 flex items-center justify-between border px-4 py-4">
              <span className="truncate text-sm">{trackedLink}</span>
              <button type="button" className="secondary-btn" onClick={handleCopy}>
                Copier
              </button>
            </div>
            <div>
              <span className="text-orange-warning-425 flex flex-row items-center text-xs">
                <AiFillWarning className="mr-2" />
                Copiez exactement ce lien !
              </span>
            </div>
          </div>
          <div className="col-span-2 flex justify-end gap-4">
            <Link to="/broadcast/campaigns" className="tertiary-btn">
              Retour
            </Link>
            <button className="primary-btn" disabled={!isChanged(values) || isErrors(errors)} onClick={handleSubmit}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
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
        if (!res.ok) throw new Error("Erreur lors de la récupération des données");
        setPublishers(
          withLegacyPublishers(res.data)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => ({ ...p, label: p.name })),
        );
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
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

      if (!res.ok) throw new Error("Erreur lors du déplacement de la campagne");
      toast.success("Campagne déplacée avec succès");
      setCampaign({ ...campaign, toPublisherId: values.toPublisherId });
      onClose();
      navigate("/broadcast/campaigns");
    } catch (error) {
      captureError(error, "Erreur lors du déplacement de la campagne");
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
        <span className="text-gray-425">
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
