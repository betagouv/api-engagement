import { toast } from "@/services/toast";
import { useEffect, useState } from "react";
import { RiBookletFill, RiFileCopyFill } from "react-icons/ri";

import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import api from "@/services/api";
import { API_URL } from "@/services/config";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const ApiAnnonceur = () => {
  const { publisher, setPublisher } = useStore();
  const [curl, setCurl] = useState(`curl --location --request POST '${API_URL}/v2/mission' --header 'apikey: ${publisher.apikey || "<apikey>"}'`);
  const [confirmAction, setConfirmAction] = useState(null); // "generate" | "delete" | null
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurl(`curl --location --request POST '${API_URL}/v2/mission' --header 'apikey: ${publisher.apikey || "<apikey>"}'`);
  }, [publisher]);

  const maskedApiKey = publisher.apikey ? `(•••• ${publisher.apikey.slice(-4)}) ` : "";

  const handleNewApiKey = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const res = await api.post(`/publisher/${publisher.id}/apikey`);
      if (!res.ok) throw res;
      setPublisher({ ...publisher, apikey: res.data });
      toast.success("Nouvelle clé API générée");
    } catch (error) {
      captureError(error, { extra: { publisherId: publisher.id } });
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const res = await api.delete(`/publisher/${publisher.id}/apikey`);
      if (!res.ok) throw res;
      setPublisher({ ...publisher, apikey: undefined });
      toast.success("Clé API supprimée");
    } catch (error) {
      captureError(error, { extra: { publisherId: publisher.id } });
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publisher.apikey);
    toast.success("Clé copiée");
  };

  if (!publisher) return <p className="p-3">Chargement...</p>;

  return (
    <div className="space-y-12 p-4 sm:p-12">
      <title>API Engagement - Flux API - Paramètres</title>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Partager des missions par API</h2>
          <p>Je partage mes missions avec mes partenaires diffuseurs via l'API</p>
        </div>

        <a href="https://doc.api-engagement.beta.gouv.fr/api-reference/mission-mission/creer-mettre-a-jour" className="secondary-btn flex items-center" target="_blank">
          <RiBookletFill className="mr-2" aria-hidden="true" />
          Documentation
        </a>
      </div>
      <div className="border-grey-border border p-4 sm:p-6">
        <div className="border-b-gray-925 flex flex-col gap-4 border-b pb-6">
          <label htmlFor="apikey" className="font-semibold">
            Votre clé API
          </label>
          <div className="flex items-center gap-4">
            <input id="apikey" className="input min-w-0 flex-1" name="apikey" readOnly value={publisher.apikey || ""} />
            <button className="secondary-btn flex h-10 w-10 shrink-0 items-center justify-center p-0" onClick={handleCopy}>
              <RiFileCopyFill aria-hidden="true" />
              <span className="sr-only">Copier la clé API</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="secondary-btn" onClick={() => setConfirmAction("generate")}>
              Générer une nouvelle clé
            </button>
            {publisher.apikey && (
              <button className="secondary-btn" onClick={() => setConfirmAction("delete")}>
                Supprimer la clé
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold sm:w-1/4">Exemple d'appel</p>
          </div>
          <textarea
            className="border-blue-france-925 bg-blue-france-975 w-full rounded-none border px-4 py-2 font-mono text-sm read-only:opacity-80"
            rows={2}
            aria-label="Exemple d'appel"
            readOnly
            value={curl}
          />
        </div>
      </div>

      <Modal open={confirmAction === "generate"} onClose={() => !loading && setConfirmAction(null)} title={`Générer une nouvelle clé API pour ${publisher.name} ?`}>
        <p>
          La clé actuelle {maskedApiKey}sera immédiatement désactivée. Les échanges de missions avec l'API Engagement, envoi comme récupération, seront interrompus tant que le
          partenaire n'aura pas intégré la nouvelle clé.
        </p>
        <p className="font-semibold">Ne confirmez que si la demande vient du partenaire ou si vous avez son accord.</p>
        <div className="flex justify-end gap-6">
          <button type="button" className="tertiary-btn" onClick={() => setConfirmAction(null)} disabled={loading}>
            Annuler
          </button>
          <button type="button" className="primary-btn" onClick={handleNewApiKey} disabled={loading}>
            {loading ? <Loader className="mr-2" /> : "Générer la nouvelle clé"}
          </button>
        </div>
      </Modal>

      <Modal open={confirmAction === "delete"} onClose={() => !loading && setConfirmAction(null)} title={`Supprimer la clé API de ${publisher.name} ?`}>
        <p>
          La clé {maskedApiKey}sera désactivée définitivement et ne pourra pas être restaurée. Les échanges de missions avec l'API Engagement seront interrompus jusqu'à la création
          d'une nouvelle clé.
        </p>
        <p className="font-semibold">Ne confirmez que si la demande vient du partenaire ou si vous avez son accord.</p>
        <div className="flex justify-end gap-6">
          <button type="button" className="tertiary-btn" onClick={() => setConfirmAction(null)} disabled={loading}>
            Annuler
          </button>
          <button type="button" className="red-btn" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader className="mr-2" /> : "Supprimer la clé"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ApiAnnonceur;
