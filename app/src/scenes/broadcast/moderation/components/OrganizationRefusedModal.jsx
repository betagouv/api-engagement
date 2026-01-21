import { useState } from "react";
import { toast } from "react-toastify";

import Loader from "../../../../components/Loader";
import Modal from "../../../../components/Modal";
import api from "../../../../services/api";
import { captureError } from "../../../../services/error";
import useStore from "../../../../services/store";
import { JVA_MODERATION_COMMENTS_LABELS } from "./Constants";

const OrganizationRefusedModal = ({ isOpen, onClose, data, update, onChange, total = 0 }) => {
  const { publisher } = useStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const where = { moderatorId: publisher.id, organizationName: data.missionOrganizationName, status: "PENDING" };

      const res = await api.put(`/moderation/many`, {
        where,
        update: { status: "REFUSED", comment: update.comment, moderatorId: publisher.id },
        moderatorId: publisher.id,
      });
      if (!res.ok) throw res;
      toast.success("Les missions ont été modérées avec succès", {
        position: "bottom-right",
      });
      onChange(res.data);
      onClose();
    } catch (error) {
      captureError(
        error,
        { extra: { data, update, publisherId: publisher.id } },
        {
          position: "bottom-right",
        },
      );
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-2/3">
      <div className="space-y-8 p-12">
        <h1 className="text-xl font-semibold">Refuser les {total} autres missions de cette organisation ?</h1>
        <p className="text-sm text-black">
          Vous venez de refuser une mission de l’organisation <b>{data.missionOrganizationName}</b> avec le motif <b>{JVA_MODERATION_COMMENTS_LABELS[update.comment]}</b>.
        </p>
        <p className="text-sm text-black">
          Cette organisation a {total} autres missions à modérer, voulez-vous passer le statut de ces missions en <b>Refusée</b> avec le motif{" "}
          <b>{JVA_MODERATION_COMMENTS_LABELS[update.comment]}</b> ?
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
