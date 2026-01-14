import { useEffect, useState } from "react";
import { RiBookletFill, RiFileCopyFill } from "react-icons/ri";
import { toast } from "react-toastify";

import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const Api = () => {
  const { publisher, setPublisher } = useStore();
  const [curl, setCurl] = useState(`curl --location --request GET 'https://api.api-engagement.beta.gouv.fr/v0/mission' --header 'apikey: ${publisher.apikey || "<apikey>"}'`);

  useEffect(() => {
    setCurl(`curl --location --request GET 'https://api.api-engagement.beta.gouv.fr/v0/mission' --header 'apikey: ${publisher.apikey || "<apikey>"}'`);
  }, [publisher]);

  const handleNewApiKey = async () => {
    const confirm = window.confirm("Êtes-vous sûr de vouloir générer une nouvelle clé API ?");
    if (!confirm) return;
    try {
      const res = await api.post(`/publisher/${publisher.id}/apikey`);
      if (!res.ok) throw res;
      setPublisher({ ...publisher, apikey: res.data });
      toast.success("Nouvelle clé API générée");
    } catch (error) {
      captureError(error, { extra: { publisherId: publisher.id } });
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Êtes-vous sûr de vouloir supprimer la clé API ?");
    if (!confirm) return;
    try {
      const res = await api.delete(`/publisher/${publisher.id}/apikey`);
      if (!res.ok) throw res;
      setPublisher({ ...publisher, apikey: undefined });
      toast.success("Clé API supprimée");
    } catch (error) {
      captureError(error, { extra: { publisherId: publisher.id } });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publisher.apikey);
    toast.success("Lien copié");
  };

  if (!publisher) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-12 p-12">
      <title>API Engagement - Flux par API - Diffuser des missions</title>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Diffuser des missions partenaires par API</h2>
          <p>Je deviens diffuseur pour mes partenaires en partageant leurs missions</p>
        </div>

        <a href="https://doc.api-engagement.beta.gouv.fr/" className="secondary-btn flex items-center" target="_blank">
          <RiBookletFill className="mr-2" />
          Documentation
        </a>
      </div>
      <div className="border-grey-border border p-6">
        <div className="border-b-gray-925 flex items-center justify-between gap-4 border-b pb-6">
          <label htmlFor="apikey" className="w-1/4 font-semibold">
            Votre clé API
          </label>
          <input id="apikey" className="input flex-1" name="apikey" readOnly value={publisher.apikey || ""} />
          <button className="secondary-btn flex h-10 w-10 items-center justify-center p-0" onClick={handleCopy}>
            <RiFileCopyFill />
          </button>
          <div className="">
            <button className="secondary-btn h-10 truncate" onClick={handleNewApiKey}>
              Générer une nouvelle clé
            </button>
          </div>
          <div className="">
            <button className="secondary-btn h-10 truncate" onClick={handleDelete}>
              Supprimer la clé
            </button>
          </div>
          {/* {user.role === "admin" && (
            <>
              <button className="flex cursor-pointer items-center border border-blue-france p-2 text-blue-france" onClick={handleReset}>
                <IoSync />
              </button>
            </>
          )} */}
        </div>
        <div className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="w-1/4 font-semibold">Exemple d'appel</p>
          </div>
          <textarea
            className="border-blue-france-925 bg-blue-france-975 w-full rounded-none border px-4 py-2 font-mono text-sm read-only:opacity-80"
            rows={2}
            readOnly
            value={curl}
          />
        </div>
      </div>
    </div>
  );
};

export default Api;
