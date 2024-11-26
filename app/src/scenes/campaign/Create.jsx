import { useEffect, useState } from "react";
import { AiFillWarning } from "react-icons/ai";
import { BiSolidInfoSquare } from "react-icons/bi";
import { RiCloseFill, RiDeleteBin6Line, RiErrorWarningFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import validator from "validator";
import Modal from "../../components/New-Modal";
import SearchSelect from "../../components/SearchSelect";

import Toggle from "../../components/Toggle";
import api from "../../services/api";
import { API_URL } from "../../services/config";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const Create = () => {
  const { publisher } = useStore();
  const [publishers, setPulishers] = useState([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [campaignId, setCampaignId] = useState(null);
  const [filters, setFilters] = useState({
    role_promoteur: true,
    name: "",
  });
  const [values, setValues] = useState({
    name: "",
    type: "",
    fromPublisherId: publisher._id,
    toPublisherId: "",
    url: "",
    trackers: [],
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", filters);
        if (!res.ok) throw res;
        setPulishers(res.data.sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ ...p, label: p.name })));
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
        navigate("/broadcast/campaigns");
      }
    };
    fetchData();
  }, [filters]);

  const handleSubmit = async () => {
    const errors = {};

    if (!values.name) errors.name = "Le nom est requis";
    if (!values.type) errors.type = "Le type de campagne est requis";
    if (!values.toPublisherId) errors.toPublisherId = "Le partenaire est requis";
    if (!values.url) errors.url = "L'url est requis";
    if (!validator.isURL(values.url)) errors.url = "L'url n'est pas valide";

    if (errors.name || errors.type || errors.toPublisherId || errors.url) {
      setErrors(errors);
      return;
    }

    try {
      values.trackers = values.trackers.filter((t) => t.key && t.value);

      const res = await api.post("/campaign", values);
      if (!res.ok) throw res;
      setCampaignId(res.data._id);
      setIsCopyModalOpen(true);
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

      <div className="bg-white shadow-lg p-12 space-y-12">
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
              className={`input mb-2 ${errors.name ? "border-b-red-main" : "border-b-black"}`}
              name="name"
              value={values.name}
              onChange={(e) => {
                setValues({ ...values, name: e.target.value });
                setErrors({ ...errors, name: "" });
              }}
              placeholder="Exemple: Communication événement janvier 2024"
            />
            {errors.name && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.name}
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col flex-1">
              <label className="mb-2 text-sm" htmlFor="type">
                Type de campagne
              </label>
              <select
                id="type"
                className={`input ${errors.type ? "border-b-red-main" : "border-b-black"} ${!values.type ? " text-gray-dark" : ""}`}
                value={values.type}
                onChange={(e) => {
                  setValues({ ...values, type: e.target.value });
                  setErrors({ ...errors, type: "" });
                }}
              >
                <option value="" disabled>
                  Sélectionner un type
                </option>
                <option value="banniere/publicité">Bannière/publicité</option>
                <option value="mailing">Mailing</option>
                <option value="tuile/bouton">Tuile/Bouton</option>
                <option value="autre">Autre</option>
              </select>
              {errors.type && (
                <div className="flex items-center text-sm text-red-main">
                  <RiErrorWarningFill className="mr-2" />
                  {errors.type}
                </div>
              )}
            </div>
            <div className="flex flex-col flex-1">
              <label className="mb-2 text-sm" htmlFor="to-publisher-id">
                Diffuse les missions de
              </label>
              <SearchSelect
                id="to-publisher-id"
                options={publishers.map((e) => ({ value: e._id, label: e.name }))}
                placeholder="Sélectionner un annonceur"
                value={values.toPublisherId}
                onChange={(e) => setValues({ ...values, toPublisherId: e.value })}
              />
              {errors.toPublisherId && (
                <div className="flex items-center text-sm text-red-main">
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
              className={`input mb-2 ${errors.url ? "border-b-red-main" : "border-b-black"}`}
              name="url"
              value={values.url}
              onChange={(e) => handleUrlChange(e)}
              placeholder="Exemple : https://votresiteweb.com/campagne"
            />
            {errors.url && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.url}
              </div>
            )}
            <span className="flex items-center text-xs text-blue-info">
              <BiSolidInfoSquare className="mr-2 text-sm" />
              <p>Lien de la page à laquelle les utilisateurs accèderont</p>
            </span>
          </div>
          <div className="flex items-center">
            <Toggle
              checked={values.trackers && values.trackers.length > 0}
              setChecked={(v) => {
                if (v) setValues({ ...values, trackers: [{ key: "", value: "" }] });
                else setValues({ ...values, trackers: [], url: values.url.split("?")[0] });
              }}
            />
            <label className="ml-2 text-base">Ajouter des paramètres pour le suivi statistique</label>
          </div>
          {values.trackers && values.trackers.length > 0 && (
            <div className="border border-gray-border p-8">
              <div className="flex items-center gap-4 mb-2">
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
                    <div className="w-10 flex justify-end">
                      {values.trackers.length > 1 && (
                        <button type="button h-full w-10" className="border border-gray-border p-2" onClick={() => handleDeleteTracker(i)}>
                          <RiDeleteBin6Line className="text-red-main" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="empty-button mt-4" onClick={() => setValues({ ...values, trackers: [...values.trackers, { key: "", value: "" }] })}>
                Ajouter un tracker
              </button>
            </div>
          )}
          <div className="flex justify-end gap-4">
            <Link to="/broadcast" className="button border border-black text-black hover:bg-gray-hover">
              Retour
            </Link>
            <button type="submit" className="button bg-blue-dark text-white hover:bg-blue-main" disabled={isErrors(errors) || isEmpty(values)} onClick={handleSubmit}>
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
    <Modal isOpen={isOpen} onClose={onClose} innerClassName="w-full">
      <div className="p-10">
        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs text-blue-dark"
            onClick={() => {
              onClose(false);
              navigate(`/campaign/${campaignId}`);
            }}
          >
            Fermer <RiCloseFill className="inline" />
          </button>
        </div>
        <h2 className="mb-8">🥳 Votre campagne est créée !</h2>
        <p>
          Pour commencer à diffuser des missions et suivre les statistiques, insérez ce lien dans le contenu de votre campagne (votre site web, vos emails, des bannières, etc.).
        </p>

        <div className="border my-4 py-4 px-4 flex items-center justify-between bg-blue-bg">
          <span className="text-sm truncate">{trackedLink}</span>
          <button type="button" className="button ml-3 border bg-transparent border-blue-dark text-blue-dark hover:bg-gray-hover" onClick={handleCopy}>
            Copier
          </button>
        </div>
        <div>
          <span className="text-base flex flex-row text-orange-warning items-center">
            <AiFillWarning className="mr-2" />
            Copiez exactement ce lien et non celui qui apparaît dans la barre de votre navigateur !
          </span>
        </div>
        <div className="col-span-2 mt-8 flex justify-end gap-6">
          <button
            type="button"
            className="button bg-blue-dark text-white hover:bg-blue-main"
            onClick={() => {
              onClose(false);
              navigate(`/campaign/${campaignId}`);
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
