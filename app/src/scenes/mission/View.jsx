import { useEffect, useState } from "react";
import { HiLocationMarker } from "react-icons/hi";
import { RiCursorFill } from "react-icons/ri";
import { useParams } from "react-router-dom";

import api from "../../services/api";
import { captureError } from "../../services/error";

const View = () => {
  const { id } = useParams();
  const [mission, setMission] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/mission/${id}`);
        if (!res.ok) throw res;
        setMission(res.data);
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération de la mission");
      }
    };
    fetchData();
  }, [id]);

  const buildLink = (mission) => {
    if (mission.applicationUrl.indexOf("http://") === -1 && mission.applicationUrl.indexOf("https://") === -1) {
      mission.applicationUrl = "https://" + mission.applicationUrl;
    }
    return mission.applicationUrl;
  };

  if (!mission) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold leading-normal">{mission.title}</h1>
        <div className="flex justify-between">
          <p>
            Pour l'association{" "}
            <a href={mission.organizationUrl} target="_blank" className="link">
              {mission.organizationName}
            </a>
          </p>
          <div className="flex items-center gap-2 text-base text-gray-425">
            <HiLocationMarker className="ml-2" />
            <span>{mission.country}</span>
            {mission.departmentName && (
              <>
                <span className="mx-2">-</span>
                <span>{mission.departmentName}</span>
              </>
            )}
            {mission.city && (
              <>
                <span className="mx-2">-</span>
                <span>{mission.city}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-12 space-y-12">
        <div className="flex justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              <span className="font-normal text-gray-425">Mission provenant de </span>
              {mission.publisherName}
              <span className="ml-2 text-lg font-normal">#{mission._id}</span>
            </h2>
            <p className="mt-2">Mise à jour le {new Date(mission.lastSyncAt).toLocaleString().replace(" ", " à ")}</p>
          </div>

          <a className="button flex cursor-pointer items-center text-sm text-blue-france" href={buildLink(mission)} target="_blank">
            <RiCursorFill className="mr-2" />
            <span>Lien vers la mission</span>
          </a>
        </div>

        <div className="flex gap-4 border border-gray-900 p-6">
          <div>
            <p className="text-xl font-semibold">Presentation de la mission</p>
            <div className="mt-2 max-h-96 overflow-y-scroll text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: mission.description.replace(/\n/g, "<br />") }} />
          </div>
          <div className="w-px bg-gray-900" />
          <div>
            <div className="mb-4 flex items-center">
              <p className="text-xl font-semibold">Domaine de la mission</p>
              <span className="ml-3 rounded-full bg-gray-950 px-3 py-2">{mission.domain}</span>
            </div>
            <div className="mb-4 flex items-center">
              <p className="text-xs font-semibold uppercase text-gray-425">Activités</p>
              <span className="ml-3 rounded bg-purple-300 px-3 py-1 text-xs font-semibold uppercase text-purple-950">{mission.activity}</span>
            </div>
            <div className="flex flex-wrap items-center">
              <p className="text-xs font-semibold uppercase text-gray-425">Compétences</p>
              {(mission.softSkills || []).map((skill, index) => (
                <span key={index} className="my-1 ml-3 rounded bgbg-[#FEECC2] px-3 py-1 text-xs font-semibold uppercase textbg-[#716043]">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button className="button border border-blue-france text-blue-france" onClick={() => setShowRaw(!showRaw)}>
            Données brutes
          </button>
        </div>

        {showRaw && (
          <div className="mt-6 overflow-scroll border border-gray-900 p-6 text-xs">
            <pre>{JSON.stringify(mission, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default View;
