import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
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
    window.confirm("Êtes-vous sûr de vouloir générer une nouvelle clé API ?");
    try {
      const res = await api.post(`/publisher/${publisher._id}/apikey`);
      if (!res.ok) throw res;
      setPublisher({ ...publisher, apikey: res.data });
      toast.success("Nouvelle clé API générée");
    } catch (error) {
      captureError(error, "Erreur lors de l'enregistrement des données");
    }
  };

  const handleDelete = async () => {
    window.confirm("Êtes-vous sûr de vouloir supprimer la clé API ?");
    try {
      const res = await api.delete(`/publisher/${publisher._id}/apikey`);
      if (!res.ok) throw res;
      setPublisher({ ...publisher, apikey: undefined });
      toast.success("Clé API supprimée");
    } catch (error) {
      captureError(error, "Erreur lors de l'enregistrement des données");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publisher.apikey);
    toast.success("Lien copié");
  };

  if (!publisher) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Diffuser des missions - Flux par API - API Engagement</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Diffuser des missions partenaires par API</h2>
          <p>Je deviens diffuseur pour mes partenaires en partageant leurs missions</p>
        </div>

        <a href="https://doc.api-engagement.beta.gouv.fr/" className="button flex items-center border border-blue-dark text-blue-dark" target="_blank">
          <RiBookletFill className="mr-2" />
          Documentation
        </a>
      </div>
      <div className="border border-gray-border p-6">
        <div className="flex items-center justify-between gap-4 border-b border-b-gray-main pb-6">
          <p className="w-1/4 font-semibold">Votre clé API</p>
          <input className="input flex-1" disabled={true} value={publisher.apikey || ""} />
          <button className="flex cursor-pointer items-center border border-blue-dark p-2 text-blue-dark" onClick={handleCopy}>
            <RiFileCopyFill />
          </button>
          <div className="">
            <button className="flex cursor-pointer items-center border border-blue-dark p-2 px-4 text-blue-dark" onClick={handleNewApiKey}>
              Générer une nouvelle clé
            </button>
          </div>
          <div className="">
            <button className="flex cursor-pointer items-center border border-blue-dark p-2 px-4 text-blue-dark" onClick={handleDelete}>
              Supprimer la clé
            </button>
          </div>
          {/* {user.role === "admin" && (
            <>
              <button className="flex cursor-pointer items-center border border-blue-dark p-2 text-blue-dark" onClick={handleReset}>
                <IoSync />
              </button>
            </>
          )} */}
        </div>
        <div className="flex flex-col gap-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="w-1/4 font-semibold">Exemple d'appel</p>
          </div>
          <textarea className="px-4 py-2 text-sm font-mono rounded-none disabled:opacity-80 w-full bg-[#F5F5FE] border border-[#E3E3FD]" rows={2} disabled={true} value={curl} />
        </div>
      </div>
    </div>
  );
};

export default Api;
