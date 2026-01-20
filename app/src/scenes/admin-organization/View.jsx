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
        const res = await api.get(`/organization/${id}`);
        if (!res.ok) throw res;
        setData(res.data);
      } catch (error) {
        captureError(error);
      }
    };
    fetchData();
  }, [id]);

  if (!data)
    return (
      <div className="my-20 flex w-full flex-col justify-between">
        <Loader />
      </div>
    );

  return (
    <div className="flex flex-col">
      <title>{`API Engagement - Organisation - ${data.title}`}</title>
      <div className="mb-10">
        <h1 className="leading-normal">{data.title}</h1>
        <div className="mt-4 flex justify-between">
          {data.status === "ACTIVE" ? (
            <div className="flex items-center gap-2">
              <p>Active</p>
              <RiCheckboxCircleFill className="text-success" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p>Inactive</p>
              <RiCloseCircleFill className="text-error" />
            </div>
          )}
          <div className="text-text-mention flex items-center gap-2 text-base">
            <HiLocationMarker className="ml-2" />
            {data.addressDepartmentName && <span>{data.addressDepartmentName}</span>}
            {data.addressCity && (
              <>
                <span className="mx-2">-</span>
                <span>{data.addressCity}</span>
                <span className="mx-2">-</span>
                <span>{data.addressPostalCode}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-12 shadow-lg">
        <div className="flex justify-between">
          <p>
            RNA: <b>{data.rna}</b>
          </p>
          <p>Assocation créée le {data.createdAt ? new Date(data.createdAt).toLocaleDateString("fr") : "N/A"}</p>
        </div>
        <div className="mb-6 flex justify-between">
          <p>
            SIRET: <b>{data.siret || "N/A"}</b>
          </p>
          <p>Dernière modification le {data.updatedAt ? new Date(data.updatedAt).toLocaleDateString("fr") : "N/A"}</p>
        </div>

        <div className="border-grey-border flex gap-4 border p-6">
          <div className="flex-1">
            <p className="text-xl font-semibold">Object de l'organisme</p>
            <p className="mt-4">{data.object}</p>
          </div>
          <div className="w-px bg-gray-900" />
          <div className="w-1/3">
            <p className="text-xl font-semibold">Adresse complète</p>
            <p className="mt-4">
              Numero: <b>{data.addressNumber}</b>
            </p>
            <p className="mt-4">
              Répetition: <b>{data.addressRepetition}</b>
            </p>
            <p className="mt-4">
              Type de voie: <b>{data.addressType}</b>
            </p>
            <p className="mt-4">
              Nom de voie: <b>{data.addressStreet}</b>
            </p>
            <p className="mt-4">
              Ville: <b>{data.addressCity}</b>
            </p>
            <p className="mt-4">
              Code postal: <b>{data.addressPostalCode}</b>
            </p>
            <p className="mt-4">
              Département:{" "}
              <b>
                {data.addressDepartmentName}, {data.addressDepartmentCode}
              </b>
            </p>
            <p className="mt-4">
              Région: <b>{data.addressRegionName}</b>
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button className="tertiary-btn" onClick={() => setShowRaw(!showRaw)}>
            Données brutes
          </button>
        </div>

        {showRaw && (
          <div className="border-grey-border mt-6 overflow-scroll border p-6 text-xs">
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default View;
