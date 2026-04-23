import { useEffect, useState } from "react";
import { HiCheckCircle, HiClock, HiLocationMarker, HiXCircle } from "react-icons/hi";
import { RiCursorFill } from "react-icons/ri";
import { useParams } from "react-router-dom";

import Tooltip from "@/components/Tooltip";
import api from "@/services/api";
import { captureError } from "@/services/error";

const ADDRESSES_PREVIEW_COUNT = 5;

const GEOLOC_STATUS_CONFIG = {
  ENRICHED_BY_PUBLISHER: { Icon: HiCheckCircle, className: "text-green-600", label: "Géolocalisée par le publisher" },
  ENRICHED_BY_API: { Icon: HiCheckCircle, className: "text-green-600", label: "Géolocalisée automatiquement" },
  SHOULD_ENRICH: { Icon: HiClock, className: "text-orange-500", label: "En attente de géolocalisation" },
  NO_DATA: { Icon: HiClock, className: "text-orange-500", label: "Données insuffisantes pour la géolocalisation" },
  NOT_FOUND: { Icon: HiXCircle, className: "text-red-500", label: "Adresse introuvable" },
  FAILED: { Icon: HiXCircle, className: "text-red-500", label: "Échec de la géolocalisation" },
};

const DEFAULT_GEOLOC_CONFIG = { Icon: HiClock, className: "text-orange-500", label: "Statut inconnu" };

const AddressStatus = ({ geolocStatus }) => {
  const config = GEOLOC_STATUS_CONFIG[geolocStatus] ?? DEFAULT_GEOLOC_CONFIG;
  return (
    <Tooltip content={config.label} ariaLabel={config.label} triggerClassName="inline-flex">
      <config.Icon className={`h-3.5 w-3.5 shrink-0 ${config.className}`} aria-hidden="true" />
    </Tooltip>
  );
};

const View = () => {
  const { id } = useParams();
  const [mission, setMission] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [showAllAddresses, setShowAllAddresses] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/mission/${id}`);
        if (!res.ok) throw res;
        setMission(res.data);
      } catch (error) {
        captureError(error, { extra: { id } });
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

  if (!mission) return <p className="p-3">Chargement...</p>;

  const addresses = mission.addresses ?? [];
  const isMultiAddress = addresses.length > 1;
  const visibleAddresses = showAllAddresses ? addresses : addresses.slice(0, ADDRESSES_PREVIEW_COUNT);
  const hiddenCount = addresses.length - ADDRESSES_PREVIEW_COUNT;

  return (
    <div className="space-y-12">
      <title>{`API Engagement - ${mission.title}`}</title>
      <div className="space-y-6">
        <h1 className="text-4xl leading-normal font-bold">{mission.title}</h1>
        <div className="flex flex-wrap justify-between gap-4">
          <p>
            Pour l'association{" "}
            <a href={mission.organizationUrl} target="_blank" className="link">
              {mission.organizationName}
            </a>
          </p>
          <div className="text-text-mention flex flex-wrap items-center gap-2 text-base">
            <HiLocationMarker className="ml-2" aria-hidden="true" />
            {isMultiAddress ? (
              <span>{addresses.length} adresses</span>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-12 bg-white p-4 sm:p-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              <span className="text-text-mention font-normal">Mission provenant de </span>
              {mission.publisherName}
            </h2>
            <p className="text-lg font-normal break-all">#{mission._id}</p>
            <p className="mt-2">Mise à jour le {new Date(mission.lastSyncAt).toLocaleString().replace(" ", " à ")}</p>
          </div>

          <a className="tertiary-bis-btn flex h-fit items-center" href={buildLink(mission)} target="_blank">
            <RiCursorFill className="mr-2" aria-hidden="true" />
            <span>Lien vers la mission</span>
          </a>
        </div>

        <div className="border-grey-border flex flex-col gap-4 border p-4 sm:flex-row sm:p-6">
          <div className="flex-1">
            <p className="text-xl font-semibold">Presentation de la mission</p>
            <div
              className="mt-2 max-h-96 overflow-y-scroll text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: `<p>${mission.description.replace(/\n/g, "</p><p>")}</p>` }}
            />
          </div>
          <div className="hidden w-px bg-gray-900 sm:block" />
          <div className="border-t border-gray-900 pt-4 sm:border-t-0 sm:pt-0">
            <div className="mb-4 space-y-2">
              <p className="text-xl font-semibold">Domaine de la mission</p>
              <span className="inline-block rounded-full bg-gray-950 px-3 py-2">{mission.domain}</span>
            </div>
            <div className="mb-4 space-y-2">
              <p className="text-text-mention text-xs font-semibold uppercase">Activités</p>
              <div className="flex flex-wrap gap-2">
                {(mission.activities || []).map((activity, index) => (
                  <span key={index} className="rounded bg-purple-300 px-3 py-1 text-xs font-semibold text-purple-950 uppercase">
                    {activity}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-text-mention text-xs font-semibold uppercase">Compétences</p>
              <div className="flex flex-wrap gap-2">
                {(mission.softSkills || []).map((skill, index) => (
                  <span key={index} className="bg-yellow-tournesol-950 text-yellow-tournesol-200 rounded px-3 py-1 text-xs font-semibold uppercase">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            {isMultiAddress && (
              <div className="mt-4 space-y-2">
                <p className="text-text-mention text-xs font-semibold uppercase">Adresses</p>
                <ul className="space-y-1">
                  {visibleAddresses.map((addr, index) => (
                    <li key={index} className="flex items-center gap-1.5 text-xs">
                      <AddressStatus geolocStatus={addr.geolocStatus} />
                      <span>{[addr.street, addr.postalCode, addr.city].filter(Boolean).join(", ")}</span>
                    </li>
                  ))}
                </ul>
                {hiddenCount > 0 && !showAllAddresses && (
                  <button className="text-text-mention cursor-pointer text-xs underline" onClick={() => setShowAllAddresses(true)}>
                    ... et {hiddenCount} autre{hiddenCount > 1 ? "s" : ""}
                  </button>
                )}
                {showAllAddresses && addresses.length > ADDRESSES_PREVIEW_COUNT && (
                  <button className="text-text-mention ml-2 cursor-pointer text-xs underline" onClick={() => setShowAllAddresses(false)}>
                    Réduire
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button className="tertiary-btn" onClick={() => setShowRaw(!showRaw)}>
            Données brutes
          </button>
        </div>

        {showRaw && (
          <div className="border-grey-border mt-6 overflow-scroll border p-6 text-xs">
            <pre>{JSON.stringify(mission, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default View;
