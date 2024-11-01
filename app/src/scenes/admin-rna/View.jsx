import { useEffect, useState } from "react";
import { HiLocationMarker } from "react-icons/hi";
import { RiCheckboxCircleFill } from "react-icons/ri";
import { useParams } from "react-router-dom";

import Loader from "../../components/Loader";
import api from "../../services/api";
import { captureError } from "../../services/error";

const View = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/rna/${id}`);
        if (!res.ok) throw res;
        setData(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
    };
    fetchData();
  }, [id]);

  if (!data)
    return (
      <div className="w-full flex flex-col justify-between my-20">
        <Loader />
      </div>
    );

  return (
    <div className="flex flex-col">
      <div className="mb-10">
        <h1 className="leading-normal">{data.title}</h1>
        <div className="mt-4 flex justify-between">
          {data.status === "ACTIVE" ? (
            <div className="flex items-center gap-2">
              <p>Active</p>
              <RiCheckboxCircleFill className="text-green-main" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p>Inactive</p>
              <RiCloseCircleFill className="text-red-main" />
            </div>
          )}
          <div className="flex items-center gap-2 text-base text-gray-dark">
            <HiLocationMarker className="ml-2" />
            {data.address_department_name && <span>{data.address_department_name}</span>}
            {data.address_city && (
              <>
                <span className="mx-2">-</span>
                <span>{data.address_city}</span>
                <span className="mx-2">-</span>
                <span>{data.address_postal_code}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg p-12">
        <div className="flex justify-between">
          <p>
            RNA: <b>{data.rna}</b>
          </p>
          <p>Assocation créée le {data.created_at ? new Date(data.created_at).toLocaleDateString("fr") : "N/A"}</p>
        </div>
        <div className="flex justify-between mb-6">
          <p>
            SIRET: <b>{data.siret || "N/A"}</b>
          </p>
          <p>Dernière modification le {data.updated_at ? new Date(data.updated_at).toLocaleDateString("fr") : "N/A"}</p>
        </div>

        <div className="flex gap-4 border border-gray-border p-6">
          <div className="flex-1">
            <p className="text-xl font-semibold">Object de l'organisme</p>
            <p className="mt-4">{data.object}</p>
          </div>
          <div className="w-[1px] bg-gray-border" />
          <div className="w-1/3">
            <p className="text-xl font-semibold">Adresse complète</p>
            <p className="mt-4">
              Numero: <b>{data.address_number}</b>
            </p>
            <p className="mt-4">
              Répetition: <b>{data.address_repetition}</b>
            </p>
            <p className="mt-4">
              Type de voie: <b>{data.address_type}</b>
            </p>
            <p className="mt-4">
              Nom de voie: <b>{data.address_street}</b>
            </p>
            <p className="mt-4">
              Ville: <b>{data.address_city}</b>
            </p>
            <p className="mt-4">
              Code postal: <b>{data.address_postal_code}</b>
            </p>
            <p className="mt-4">
              Département:{" "}
              <b>
                {data.address_department_name}, {data.address_department_code}
              </b>
            </p>
            <p className="mt-4">
              Région: <b>{data.address_region_name}</b>
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button className="button border border-blue-dark text-blue-dark" onClick={() => setShowRaw(!showRaw)}>
            Données brutes
          </button>
        </div>

        {showRaw && (
          <div className="mt-6 overflow-scroll border border-gray-border p-6 text-xs">
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default View;
