import { useEffect, useState } from "react";
import { AiFillWarning } from "react-icons/ai";
import { BiSolidInfoSquare } from "react-icons/bi";
import { RiDeleteBin6Line, RiErrorWarningFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Modal from "../../components/New-Modal";
import SearchSelect from "../../components/SearchSelect";

import Toggle from "../../components/Toggle";
import api from "../../services/api";
import { API_URL } from "../../services/config";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import { isValidUrl } from "../../services/utils";
import { withLegacyPublishers } from "../../utils/publisher";

const Create = () => {
  const { publisher } = useStore();
  const [publishers, setPulishers] = useState([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [campaignId, setCampaignId] = useState(null);
  const [values, setValues] = useState({
    name: "",
    type: "",
    fromPublisherId: publisher.id,
    toPublisherId: "",
    url: "",
    trackers: [],
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", { role: "annonceur" });
        if (!res.ok) throw res;
        setPulishers(
          withLegacyPublishers(res.data)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => ({ ...p, label: p.name })),
        );
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
        navigate("/broadcast/campaigns");
      }
    };
    fetchData();
  }, []);

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
      values.trackers = values.trackers.filter((t) => t.key && t.value);

      const res = await api.post("/campaign", values);
      if (!res.ok) {
        if (res.status === 409) return toast.error("Une campagne avec ce nom existe déjà");
        else throw res;
      }
      setCampaignId(res.data.id);
      setIsCopyModalOpen(true);
      toast.success("Campagne créée avec succès");
    } catch (error) {
      captureError(error, "Erreur lors de la création de la campagne");
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
    setErrors({ ...errors, url: "" });
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

  const isErrors = (e) => e.name || e.toPublisherId || e.url || e.type;
  const isEmpty = (v) => !v.name || !v.toPublisherId || !v.url || !v.type;

  return (
    <div className="space-y-12">
      <CopyModal isOpen={isCopyModalOpen} campaignId={campaignId} onClose={() => setIsCopyModalOpen(false)} />

      <h1 className="text-4xl font-bold">Nouvelle campagne de diffusion</h1>

      <div className="space-y-12 bg-white p-12 shadow-lg">
        <div className="mb-6 flex justify-between">
          <h2 className="text-3xl font-bold">Paramétrez votre campagne</h2>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="name">
              Nom de la campagne
            </label>
            <input
              id="name"
              className={`input mb-2 ${errors.name ? "border-b-red-error" : "border-b-black"}`}
              name="name"
              value={values.name}
              onChange={(e) => {
                setValues({ ...values, name: e.target.value });
                setErrors({ ...errors, name: "" });
              }}
              placeholder="Exemple: Communication événement janvier 2024"
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
                className={`input ${errors.type ? "border-b-red-error" : "border-b-black"} ${!values.type ? "text-gray-425" : ""}`}
                value={values.type}
                onChange={(e) => {
                  setValues({ ...values, type: e.target.value });
                  setErrors({ ...errors, type: "" });
                }}
              >
                <option value="" disabled>
                  Sélectionner un type
                </option>
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
                placeholder="Sélectionner un annonceur"
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
            <input
              id="url"
              className={`input mb-2 ${errors.url ? "border-b-red-error" : "border-b-black"}`}
              name="url"
              value={values.url}
              onChange={(e) => handleUrlChange(e)}
              placeholder="Exemple : https://votresiteweb.com/campagne"
            />
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
          <div className="flex justify-end gap-4">
            <Link to="/broadcast" className="tertiary-btn">
              Retour
            </Link>
            <button type="submit" className="primary-btn" disabled={isErrors(errors) || isEmpty(values)} onClick={handleSubmit}>
              Créer la campagne
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CopyModal = ({ isOpen, campaignId, onClose }) => {
  const navigate = useNavigate();
  const trackedLink = `${API_URL}/r/campaign/${campaignId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackedLink);
    toast.success("Lien copié");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-10">
        <h2 className="mb-8 text-lg font-bold">🥳 Votre campagne est créée !</h2>
        <p>
          Pour commencer à diffuser des missions et suivre les statistiques, insérez ce lien dans le contenu de votre campagne (votre site web, vos emails, des bannières, etc.).
        </p>

        <div className="border-blue-france-925 bg-blue-france-975 my-4 flex items-center justify-between border px-4 py-4">
          <span className="truncate text-sm">{trackedLink}</span>
          <button type="button" className="secondary-btn" onClick={handleCopy}>
            Copier
          </button>
        </div>
        <div>
          <span className="textbg-[#FEECC2] flex flex-row items-center text-base">
            <AiFillWarning className="mr-2" />
            Copiez exactement ce lien et non celui qui apparaît dans la barre de votre navigateur !
          </span>
        </div>
        <div className="col-span-2 mt-8 flex justify-end gap-6">
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              onClose(false);
              navigate(`/broadcast/campaign/${campaignId}`);
            }}
          >
            C'est fait
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default Create;
