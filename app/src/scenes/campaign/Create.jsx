import { useState } from "react";
import { AiFillWarning } from "react-icons/ai";
import { RiArrowLeftLine } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Modal from "../../components/New-Modal";
import api from "../../services/api";
import { API_URL } from "../../services/config";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import { isValidUrl } from "../../services/utils";
import Information from "./components/Information";
import Trackers from "./components/Trackers";

const Create = () => {
  const { publisher } = useStore();
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
      captureError(error, { extra: { values } });
    }
  };

  const isErrors = (e) => e.name || e.toPublisherId || e.url || e.type;
  const isEmpty = (v) => !v.name || !v.toPublisherId || !v.url || !v.type;

  return (
    <>
      <CopyModal isOpen={isCopyModalOpen} campaignId={campaignId} onClose={() => setIsCopyModalOpen(false)} />
      <div className="flex flex-col gap-8">
        <Link to="/broadcast/campaigns" className="border-blue-france text-blue-france flex w-fit items-center gap-2 border-b text-[16px]">
          <RiArrowLeftLine />
          Retour
        </Link>

        <h1 className="text-4xl font-bold">Nouvelle campagne de diffusion</h1>

        <div className="flex flex-col gap-8 bg-white p-10 shadow-lg">
          <div>
            <h2 className="mb-2 text-3xl font-bold">Paramètres</h2>
            <p className="text-gray-425 text-xs">
              Les champs avec <span className="text-red-marianne">*</span> sont requis.
            </p>
          </div>
          <Information values={values} onChange={setValues} errors={errors} onErrorChange={setErrors} />
          <Trackers values={values} onChange={setValues} />

          <div className="flex justify-end gap-4">
            <button type="submit" className="primary-btn" disabled={isErrors(errors) || isEmpty(values)} onClick={handleSubmit}>
              Créer la campagne
            </button>
          </div>
        </div>
      </div>
    </>
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
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        navigate(`/broadcast/campaign/${campaignId}`);
      }}
      className="min-w-4xl"
    >
      <div className="flex flex-col gap-6 p-10 pt-16">
        <h2 className="text-2xl font-bold">🥳 Votre campagne est créée !</h2>
        <p className="text-base">Pour commencer à diffuser des missions et suivre les statistiques, insérez ce lien dans le contenu de votre campagne.</p>

        <div className="border-blue-france-925 bg-blue-france-975 flex items-center justify-between border p-6">
          <span className="truncate text-sm">{trackedLink}</span>
          <button type="button" className="secondary-btn" onClick={handleCopy}>
            Copier
          </button>
        </div>

        <div className="text-orange-warning-425 flex items-center gap-2">
          <AiFillWarning className="text-2xl" />
          <p className="flex flex-row items-center text-base">Copiez exactement ce lien et non celui qui apparaît dans la barre de votre navigateur !</p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              onClose();
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
