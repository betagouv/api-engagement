import { useEffect, useState } from "react";
import { HiCheckCircle, HiClock, HiLocationMarker, HiXCircle } from "react-icons/hi";
import { RiCursorFill, RiInformationLine } from "react-icons/ri";
import { useParams } from "react-router-dom";

import Tabs from "@/components/Tabs";
import Tooltip from "@/components/Tooltip";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { toast } from "@/services/toast";

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

const formatDateTime = (date) => (date ? new Date(date).toLocaleString("fr").replace(" ", " à ") : "N/A");

const formatScore = (value) => (typeof value === "number" ? value.toLocaleString("fr", { maximumFractionDigits: 2 }) : "N/A");

const formatConfidence = (value) =>
  typeof value === "number" ? `${(value * 100).toLocaleString("fr", { maximumFractionDigits: 0 })} %` : "N/A";

const AdminDataTable = ({ caption, emptyMessage, headers, rows, renderRow }) => {
  if (!rows?.length) {
    return <p className="text-text-mention text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="border-grey-border overflow-x-auto border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-gray-950 text-xs font-semibold uppercase">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
};

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
  const { user } = useStore();
  const [mission, setMission] = useState(null);
  const [activeTechnicalTab, setActiveTechnicalTab] = useState("enrichment");
  const [triggeringTask, setTriggeringTask] = useState(null);
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

  const handleTriggerTask = async (task) => {
    setTriggeringTask(task);
    try {
      const res = await api.post(`/mission/${id}/${task}`, {});
      if (!res.ok) {
        throw res;
      }
      toast.success(task === "enrichment" ? "Enrichissement relancé. Rafraîchissez dans quelques secondes." : "Scoring relancé. Rafraîchissez dans quelques secondes.");
    } catch (error) {
      captureError(error, { message: task === "enrichment" ? "Erreur lors de la relance de l'enrichissement" : "Erreur lors de la relance du scoring", extra: { id, task } });
    }
    setTriggeringTask(null);
  };

  if (!mission) return <p className="p-3">Chargement...</p>;

  const addresses = mission.addresses ?? [];
  const isMultiAddress = addresses.length > 1;
  const visibleAddresses = showAllAddresses ? addresses : addresses.slice(0, ADDRESSES_PREVIEW_COUNT);
  const hiddenCount = addresses.length - ADDRESSES_PREVIEW_COUNT;
  const isAdmin = user?.role === "admin";
  const rawMission = Object.fromEntries(Object.entries(mission).filter(([key]) => !["adminEnrichment", "adminScoring"].includes(key)));
  const selectedTechnicalTabKey = isAdmin ? activeTechnicalTab : "raw";
  const technicalTabs = [
    ...(isAdmin
      ? [
          { key: "enrichment", label: "🧠 Enrichissement" },
          { key: "scoring", label: "🎯 Scoring" },
        ]
      : []),
    { key: "raw", label: "🧾 Données brutes" },
  ].map((tab) => ({
    ...tab,
    id: `mission-technical-tab-${tab.key}`,
    isActive: selectedTechnicalTabKey === tab.key,
    onSelect: () => setActiveTechnicalTab(tab.key),
  }));
  const activeTechnicalTabConfig = technicalTabs.find((tab) => tab.isActive) ?? technicalTabs[0];
  const technicalTabKey = activeTechnicalTabConfig?.key ?? "raw";

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

        <div className="border-grey-border grid grid-cols-1 gap-4 border p-4 lg:grid-cols-[minmax(0,2fr)_1px_minmax(280px,1fr)] lg:p-6">
          <div className="min-w-0">
            <p className="text-xl font-semibold">Presentation de la mission</p>
            <div
              className="mt-2 max-h-96 overflow-y-scroll text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: `<p>${mission.description.replace(/\n/g, "</p><p>")}</p>` }}
            />
          </div>
          <div className="hidden w-px bg-gray-900 lg:block" />
          <div className="min-w-0 border-t border-gray-900 pt-4 lg:border-t-0 lg:pt-0">
            <div className="mb-4 space-y-2">
              <p className="text-xl font-semibold">Domaine de la mission</p>
              <span className="inline-block rounded-full bg-gray-950 px-3 py-2">{mission.domain}</span>
            </div>
            <div className="mb-4 space-y-2">
              <p className="text-text-mention text-xs font-semibold uppercase">Activités</p>
              <div className="flex flex-wrap gap-2">
                {(mission.activities || []).map((activity, index) => (
                  <span key={index} className="max-w-full rounded bg-purple-300 px-3 py-1 text-xs font-semibold break-words text-purple-950 uppercase">
                    {activity}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-text-mention text-xs font-semibold uppercase">Compétences</p>
              <div className="flex flex-wrap gap-2">
                {(mission.softSkills || []).map((skill, index) => (
                  <span key={index} className="bg-yellow-tournesol-950 text-yellow-tournesol-200 max-w-full rounded px-3 py-1 text-xs font-semibold break-words uppercase">
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
          <h3 className="mb-4 text-2xl font-bold">Données techniques</h3>
          <Tabs
            tabs={technicalTabs}
            ariaLabel="Données techniques de la mission"
            panelId="mission-technical-panel"
            className="flex items-center gap-4 pl-4 font-semibold text-black"
            variant="primary"
            tabClassName="cursor-pointer"
          />

          <section id="mission-technical-panel" role="tabpanel" aria-labelledby={activeTechnicalTabConfig?.id} className="border-grey-border space-y-4 border p-6">
            {isAdmin && technicalTabKey === "enrichment" && (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h4 className="text-xl font-semibold">Données d&apos;enrichissement</h4>
                    {mission.adminEnrichment ? (
                      <p className="text-text-mention mt-1 text-sm">
                        Version {mission.adminEnrichment.promptVersion} · Statut {mission.adminEnrichment.status} · Complété le{" "}
                        {formatDateTime(mission.adminEnrichment.completedAt)}
                      </p>
                    ) : (
                      <p className="text-text-mention mt-1 text-sm">Aucun enrichissement complété.</p>
                    )}
                  </div>
                  <button className="secondary-btn shrink-0" type="button" disabled={triggeringTask !== null} onClick={() => handleTriggerTask("enrichment")}>
                    🧠 Relancer l&apos;enrichment
                  </button>
                </div>
                {mission.adminEnrichment && (
                  <AdminDataTable
                    caption="Valeurs d'enrichissement"
                    emptyMessage="Aucune valeur d'enrichissement."
                    headers={["Taxonomie", "Valeur", "Confiance"]}
                    rows={mission.adminEnrichment.values}
                    renderRow={(value) => (
                      <tr key={value.id} className="border-grey-border border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium">{value.taxonomyLabel}</p>
                          <p className="text-text-mention text-xs">{value.taxonomyKey}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <p>{value.valueLabel}</p>
                            {value.reason && (
                              <Tooltip
                                ariaLabel="Voir la raison de classification"
                                triggerClassName="text-text-mention inline-flex"
                                tooltipClassName="border-grey-border z-50 max-w-sm border bg-white p-4 text-sm shadow-lg"
                                content={value.reason}
                              >
                                <RiInformationLine className="text-lg" aria-hidden="true" />
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-text-mention text-xs">{value.valueKey}</p>
                        </td>
                        <td className="px-4 py-3">{formatConfidence(value.confidence)}</td>
                      </tr>
                    )}
                  />
                )}
              </>
            )}

            {isAdmin && technicalTabKey === "scoring" && (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h4 className="text-xl font-semibold">Données de scoring</h4>
                    {mission.adminScoring ? (
                      <p className="text-text-mention mt-1 text-sm">
                        Créé le {formatDateTime(mission.adminScoring.createdAt)} · Mis à jour le {formatDateTime(mission.adminScoring.updatedAt)}
                      </p>
                    ) : (
                      <p className="text-text-mention mt-1 text-sm">Aucun scoring associé au dernier enrichissement complété.</p>
                    )}
                  </div>
                  <button className="secondary-btn shrink-0" type="button" disabled={triggeringTask !== null} onClick={() => handleTriggerTask("scoring")}>
                    🎯 Relancer le scoring
                  </button>
                </div>
                {mission.adminScoring && (
                  <AdminDataTable
                    caption="Valeurs de scoring"
                    emptyMessage="Aucune valeur de scoring."
                    headers={["Taxonomie", "Valeur", "Score", "Mis à jour le"]}
                    rows={mission.adminScoring.values}
                    renderRow={(value) => (
                      <tr key={value.id} className="border-grey-border border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium">{value.taxonomyLabel}</p>
                          <p className="text-text-mention text-xs">{value.taxonomyKey}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p>{value.valueLabel}</p>
                          <p className="text-text-mention text-xs">{value.valueKey}</p>
                        </td>
                        <td className="px-4 py-3">{formatScore(value.score)}</td>
                        <td className="px-4 py-3">{formatDateTime(value.updatedAt)}</td>
                      </tr>
                    )}
                  />
                )}
              </>
            )}

            {technicalTabKey === "raw" && (
              <div className="overflow-scroll text-xs">
                <pre>{JSON.stringify(rawMission, null, 2)}</pre>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default View;
