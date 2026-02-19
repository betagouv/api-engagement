import { useEffect, useMemo, useState } from "react";
import { RiInformationLine } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";
import Tooltip from "@/components/Tooltip";

import RadioInput from "@/components/RadioInput";
import Table from "@/components/Table";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { timeSince } from "@/services/utils";

const TABLE_HEADER = [{ title: "Mission" }, { title: "Type" }, { title: "Source" }, { title: "Activité", position: "right" }];
const MAX_EVENTS = 25;

const RealTime = () => {
  const { publisher, flux } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [type, setType] = useState(searchParams.get("type") || "print");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const titleSuffix = useMemo(
    () => ({ apply: "des candidatures", click: "des redirections", print: "des impressions", account: "des créations de compte" })[type] || "des activités",
    [type],
  );

  const descriptionSuffix = useMemo(
    () =>
      ({
        apply: " des dernières candidatures",
        click: " des dernières redirections",
        print: " des dernières impressions",
      })[type] || " de toutes les dernières activités",
    [type],
  );

  const getCustomAttributesEntries = (customAttributes) => {
    if (!customAttributes) {
      return [];
    }

    if (Array.isArray(customAttributes)) {
      return customAttributes.map((value, index) => [String(index), value]);
    }

    if (typeof customAttributes === "object") {
      return Object.entries(customAttributes);
    }

    return [["valeur", customAttributes]];
  };

  const formatCustomAttributeValue = (value) => {
    if (value === null) return "null";
    if (value === undefined) return "—";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return JSON.stringify(value);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = {
          type,
          size: MAX_EVENTS,
        };

        if (flux === "from") query.fromPublisherId = publisher.id;
        if (flux === "to") query.toPublisherId = publisher.id;

        const res = await api.post("/stats/search", query);

        if (!res.ok) throw res;
        setEvents((res.data || []).slice(0, MAX_EVENTS));
        setSearchParams(type ? { type } : {});
      } catch (error) {
        captureError(error, { extra: { publisherId: publisher.id, type } });
      }
      setLoading(false);
    };

    if (!publisher?.id) {
      return;
    }

    setLoading(true);
    fetchData();
  }, [flux, publisher, setSearchParams, type]);

  return (
    <div className="space-y-12 p-12">
      <title>API Engagement - Événements en temps réel - Paramètres</title>
      <div className="border-grey-border space-y-8 border p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full space-y-2 lg:w-[40%]">
            <h2 className="text-3xl font-bold">Activité {titleSuffix} en temps réel</h2>
            <p className="text-text-mention mb-4 text-xs">L'historique{descriptionSuffix}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end lg:gap-4">
            <RadioInput id="type-print" name="type" value="print" label="Impressions" checked={type === "print"} onChange={(e) => setType(e.target.value)} />
            <RadioInput id="type-click" name="type" value="click" label="Redirections" checked={type === "click"} onChange={(e) => setType(e.target.value)} />
            <RadioInput id="type-apply" name="type" value="apply" label="Candidatures" checked={type === "apply"} onChange={(e) => setType(e.target.value)} />
            <RadioInput id="type-account" name="type" value="account" label="Créations de compte" checked={type === "account"} onChange={(e) => setType(e.target.value)} />
          </div>
        </div>

        <Table header={TABLE_HEADER} total={events.length} loading={loading} auto>
          {events.map((item, i) => {
            const entries = getCustomAttributesEntries(item.customAttributes);
            const hasClientEventId = Boolean(item.clientEventId);
            const tooltipId = entries.length || hasClientEventId ? `custom-attributes-${item.id || i}` : null;

            return (
              <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item h-auto md:h-16`}>
                <td className="px-4 py-3 align-middle">
                  {item.missionId && item.missionTitle ? (
                    <Link to={`/mission/${item.missionId}`} className="line-clamp-3 block max-w-prose hover:underline">
                      {item.missionTitle}
                    </Link>
                  ) : (
                    <span className="block max-w-prose">Campagne: {item.sourceName}</span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="inline-flex items-center gap-1 flex-wrap">
                    <span>{item.type === "apply" ? "Candidature" : item.type === "click" ? "Redirection" : "Impression"}</span>
                    {tooltipId ? (
                      <Tooltip
                        id={tooltipId}
                        ariaLabel="Voir les détails de l'événement"
                        triggerClassName="text-text-mention hover:text-text-regular cursor-pointer align-middle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        tooltipClassName="border-grey-border max-w-md border bg-white text-base text-black shadow-lg"
                        clickable
                        content={
                          <div className="space-y-2">
                            <p className="font-semibold">Détails de l'événement</p>
                            {hasClientEventId ? (
                              <div className="rounded bg-gray-50 px-2 py-1 text-xs">
                                <span className="font-semibold">clientEventId :</span> {item.clientEventId}
                              </div>
                            ) : null}
                            {entries.length > 0 ? (
                              <div className="max-h-60 overflow-auto">
                                <table className="min-w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-grey-border border-b">
                                      <th scope="col" className="py-1 pr-3 font-semibold">
                                        Clé
                                      </th>
                                      <th scope="col" className="py-1 font-semibold">
                                        Valeur
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entries.map(([key, value]) => (
                                      <tr key={key}>
                                        <th scope="row" className="text py-1 pr-3 font-medium">
                                          {key}
                                        </th>
                                        <td className="py-1 break-words">{formatCustomAttributeValue(value)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-text-mention text-xs">Aucun attribut personnalisé.</p>
                            )}
                          </div>
                        }
                      >
                        <RiInformationLine aria-hidden="true" />
                      </Tooltip>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">{item.fromPublisherName}</td>
                <td className="px-4 py-3 text-right align-middle">
                  <div className="flex items-center justify-end gap-2">
                    <span className="whitespace-nowrap">{timeSince(new Date(item.createdAt))}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </div>
    </div>
  );
};

export default RealTime;
