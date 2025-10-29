import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import Loader from "../../../../components/Loader";
import Modal from "../../../../components/Modal";
import api from "../../../../services/api";
import { captureError } from "../../../../services/error";
import useStore from "../../../../services/store";
import { JVA_MODERATION_COMMENTS_LABELS } from "./Constants";

const OrganizationRefusedModal = ({ isOpen, onClose, organizationName, comment, onChange }) => {
  const { publisher } = useStore();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/moderation/search", { moderatorId: publisher._id, organization: organizationName, size: 100 });
        if (!res.ok) throw res;
        setMissions(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
    };

    if (isOpen) fetchData();
  }, [organizationName, isOpen]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = [];
      for (const mission of missions) {
        const res = await api.put(`/moderation/${mission._id}`, { status: "REFUSED", comment, moderatorId: publisher._id });
        if (!res.ok) throw res;
        data.push(res.data);
      }
      toast.success("Les missions ont été modérées avec succès", {
        position: "bottom-right",
      });
      onChange(data);
      onClose();
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour des missions", {
        position: "bottom-right",
      });
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-2/3">
      <div className="space-y-8 p-12">
        <h1 className="text-xl font-semibold">Refuser les {missions.length} autres missions de cette organisation ?</h1>
        <p className="text-sm text-black">
          Vous venez de refuser une mission de l’organisation <b>{organizationName}</b> avec le motif <b>{JVA_MODERATION_COMMENTS_LABELS[comment]}</b>.
        </p>
        <p className="text-sm text-black">
          Cette organisation a {missions.length} autres missions à modérer, voulez-vous passer le statut de ces missions en <b>Refusée</b> avec le motif{" "}
          <b>{JVA_MODERATION_COMMENTS_LABELS[comment]}</b> ?
        </p>
        <div className="flex justify-end gap-4">
          <button className="secondary-btn" onClick={onClose}>
            Non, je vais vérifier
          </button>
          <button className="primary-btn flex justify-center" onClick={handleSubmit}>
            {loading ? <Loader className="h-6 w-6" /> : "Oui, refuser les missions"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default OrganizationRefusedModal;
